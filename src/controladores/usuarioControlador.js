// Controlador para la gestión del perfil de usuario y sus subastas creadas/ganadas
const { Op } = require("sequelize");

const { Subasta, Puja, Categoria, Usuario } = require("../modelos");

const { capturarAsincrono } = require("../utilidades/manejadorErrores");

//====================================
// ESTADOS DEL HISTORIAL
// No son los estados de la subasta, sino el resultado de la
// participación del usuario en ella.
//====================================

const ESTADOS_HISTORIAL = {
    EN_CURSO: "en_curso",
    GANADA: "ganada",
    PERDIDA: "perdida",
    CANCELADA: "cancelada"
};

const ETIQUETAS_ESTADO = {
    [ESTADOS_HISTORIAL.EN_CURSO]: "En curso",
    [ESTADOS_HISTORIAL.GANADA]: "Ganada",
    [ESTADOS_HISTORIAL.PERDIDA]: "Perdida",
    [ESTADOS_HISTORIAL.CANCELADA]: "Cancelada"
};

//====================================
// PESTAÑAS Y FILTROS DE LA VISTA
// La clave viaja en la query string (/historial?estado=ganadas).
//====================================

const PESTANAS = [
    { clave: "todas", etiqueta: "Todas" },
    { clave: "en-curso", etiqueta: "En curso" },
    { clave: "ganadas", etiqueta: "Ganadas" },
    { clave: "finalizadas", etiqueta: "Finalizadas" }
];

const FILTROS = {
    todas: () => true,
    "en-curso": (registro) => registro.estado === ESTADOS_HISTORIAL.EN_CURSO,
    ganadas: (registro) => registro.estado === ESTADOS_HISTORIAL.GANADA,
    // Finalizadas agrupa todo lo que ya cerró: ganadas, perdidas y canceladas
    finalizadas: (registro) => registro.estado !== ESTADOS_HISTORIAL.EN_CURSO
};

//====================================
// RELACIONES QUE ACOMPAÑAN A CADA SUBASTA
//====================================

const INCLUIR_DATOS_SUBASTA = [
    {
        model: Categoria,
        as: "categoria",
        attributes: ["id", "nombre"]
    },
    {
        model: Usuario,
        as: "vendedor",
        attributes: ["id", "nombre"]
    }
];

//====================================
// UTILIDADES
//====================================

// Los DECIMAL de Postgres llegan como cadena: se normalizan a número
const aNumero = (valor) =>
    valor === null || valor === undefined ? null : Number(valor);

//====================================
// CLASIFICAR LA PARTICIPACIÓN
// Ganada si el usuario es el ganador_id de una subasta cerrada,
// perdida si cerró con otro ganador, y en curso mientras siga abierta.
//====================================

const clasificarParticipacion = (subasta, usuarioId) => {
    if (subasta.estado === "rechazada") {
        return ESTADOS_HISTORIAL.CANCELADA;
    }

    if (subasta.estado === "finalizada") {
        return subasta.ganador_id === usuarioId
            ? ESTADOS_HISTORIAL.GANADA
            : ESTADOS_HISTORIAL.PERDIDA;
    }

    // Pendiente y activa siguen abiertas para el usuario
    return ESTADOS_HISTORIAL.EN_CURSO;
};

//====================================
// REGISTRO DEL HISTORIAL
// Une los datos de la subasta con el resumen de las pujas
// que el usuario hizo en ella.
//====================================

const construirRegistro = (subasta, pujas, usuarioId) => {
    const estado = clasificarParticipacion(subasta, usuarioId);

    return {
        id: subasta.id,
        titulo: subasta.titulo,
        imagen_url: subasta.imagen_url,
        categoria: subasta.categoria ? subasta.categoria.nombre : "General",
        vendedor: subasta.vendedor ? subasta.vendedor.nombre : null,
        mi_puja_maxima: pujas ? pujas.mi_puja_maxima : null,
        total_mis_pujas: pujas ? pujas.total_pujas : 0,
        ultima_puja_at: pujas ? pujas.ultima_puja_at : null,
        // Cuando la subasta cerró, el precio actual ya es el precio final
        precio: aNumero(subasta.precio_actual),
        precio_es_final: subasta.estado === "finalizada",
        estado,
        etiqueta_estado: ETIQUETAS_ESTADO[estado],
        fecha: subasta.fecha_cierre || subasta.fecha_fin
    };
};

//====================================
// RESUMEN POR PESTAÑA
// Se calcula sobre el historial completo para que los contadores
// no cambien al aplicar un filtro.
//====================================

const calcularResumen = (registros) => {
    const resumen = {};

    PESTANAS.forEach(({ clave }) => {
        resumen[clave] = registros.filter(FILTROS[clave]).length;
    });

    resumen.perdidas = registros.filter(
        (registro) => registro.estado === ESTADOS_HISTORIAL.PERDIDA
    ).length;

    return resumen;
};

//====================================
// HISTORIAL DE SUBASTAS DEL USUARIO
// GET /historial
//
// La ruta va detrás del intermediario requiereSesionVista, así que
// aquí req.usuario siempre existe.
//
// Une Puja con Subasta para traer todas las subastas en las que el
// usuario ofertó, y añade las que ganó aunque ya no conserve pujas.
//====================================

const obtenerHistorialUsuario = capturarAsincrono(async (req, res) => {
    const usuarioId = req.usuario.id;

    const filtroActual = FILTROS[req.query.estado] ? req.query.estado : "todas";

    //---- 1. Subastas en las que el usuario participó ofertando ----

    const pujas = await Puja.findAll({
        where: { usuario_id: usuarioId },
        include: [
            {
                model: Subasta,
                as: "subasta",
                required: true,
                include: INCLUIR_DATOS_SUBASTA
            }
        ],
        order: [["created_at", "DESC"]]
    });

    // Una subasta puede tener varias pujas del mismo usuario: se agrupan
    // para quedarnos con su puja más alta y cuántas veces ofertó.
    const participaciones = new Map();

    pujas.forEach((puja) => {
        const monto = aNumero(puja.monto);
        const acumulado = participaciones.get(puja.subasta_id);

        if (!acumulado) {
            participaciones.set(puja.subasta_id, {
                subasta: puja.subasta,
                mi_puja_maxima: monto,
                total_pujas: 1,
                ultima_puja_at: puja.created_at
            });

            return;
        }

        acumulado.total_pujas += 1;

        if (monto > acumulado.mi_puja_maxima) {
            acumulado.mi_puja_maxima = monto;
        }

        // Las pujas llegan ordenadas de más reciente a más antigua
        if (!acumulado.ultima_puja_at) {
            acumulado.ultima_puja_at = puja.created_at;
        }
    });

    //---- 2. Subastas ganadas que no aparecieron entre sus pujas ----

    const idsConPujas = [...participaciones.keys()];

    const condicionGanadas = { ganador_id: usuarioId };

    if (idsConPujas.length > 0) {
        condicionGanadas.id = { [Op.notIn]: idsConPujas };
    }

    const soloGanadas = await Subasta.findAll({
        where: condicionGanadas,
        include: INCLUIR_DATOS_SUBASTA
    });

    //---- 3. Unificar, clasificar y ordenar ----

    const registros = [
        ...[...participaciones.values()].map((participacion) =>
            construirRegistro(participacion.subasta, participacion, usuarioId)
        ),
        ...soloGanadas.map((subasta) =>
            construirRegistro(subasta, null, usuarioId)
        )
    ];

    // Lo más reciente primero: las que siguen abiertas quedan arriba
    registros.sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    return res.render("paginas/historial", {
        titulo: "Mi Historial - SubastasPro",
        paginaActual: "historial",
        usuario: req.usuario,
        historial: registros.filter(FILTROS[filtroActual]),
        resumen: calcularResumen(registros),
        pestanas: PESTANAS,
        filtroActual
    });
});

module.exports = {
    ESTADOS_HISTORIAL,
    obtenerHistorialUsuario
};
