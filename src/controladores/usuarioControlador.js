// Controlador para la gestión del perfil de usuario y sus subastas creadas/ganadas
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");

const { Subasta, Puja, Categoria, Usuario, Favorito } = require("../modelos");
const { CLAVE_LONGITUD_MINIMA, RONDAS_SAL } = require("../utilidades/constantes");
const { responderExito, responderError, capturarAsincrono } = require("../utilidades/manejadorErrores");

//====================================
// ESTADOS DEL HISTORIAL
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
    finalizadas: (registro) => registro.estado !== ESTADOS_HISTORIAL.EN_CURSO
};

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

const aNumero = (valor) => (valor === null || valor === undefined ? null : Number(valor));

const usuarioPublico = (usuario) => ({
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol
});

const clasificarParticipacion = (subasta, usuarioId) => {
    if (subasta.estado === "rechazada") {
        return ESTADOS_HISTORIAL.CANCELADA;
    }
    if (subasta.estado === "finalizada") {
        return subasta.ganador_id === usuarioId ? ESTADOS_HISTORIAL.GANADA : ESTADOS_HISTORIAL.PERDIDA;
    }
    return ESTADOS_HISTORIAL.EN_CURSO;
};

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
        precio: aNumero(subasta.precio_actual),
        precio_es_final: subasta.estado === "finalizada",
        estado,
        etiqueta_estado: ETIQUETAS_ESTADO[estado],
        fecha: subasta.fecha_cierre || subasta.fecha_fin
    };
};

const calcularResumen = (registros) => {
    const resumen = {};
    PESTANAS.forEach(({ clave }) => {
        resumen[clave] = registros.filter(FILTROS[clave]).length;
    });
    resumen.perdidas = registros.filter((registro) => registro.estado === ESTADOS_HISTORIAL.PERDIDA).length;
    return resumen;
};

//====================================
// HISTORIAL DE SUBASTAS DEL USUARIO
// GET /historial
//====================================

const obtenerHistorialUsuario = capturarAsincrono(async (req, res) => {
    const usuarioId = req.usuario.id;
    const filtroActual = FILTROS[req.query.estado] ? req.query.estado : "todas";

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
        if (!acumulado.ultima_puja_at) {
            acumulado.ultima_puja_at = puja.created_at;
        }
    });

    const idsConPujas = [...participaciones.keys()];
    const condicionGanadas = { ganador_id: usuarioId };

    if (idsConPujas.length > 0) {
        condicionGanadas.id = { [Op.notIn]: idsConPujas };
    }

    const soloGanadas = await Subasta.findAll({
        where: condicionGanadas,
        include: INCLUIR_DATOS_SUBASTA
    });

    const registros = [
        ...[...participaciones.values()].map((participacion) =>
            construirRegistro(participacion.subasta, participacion, usuarioId)
        ),
        ...soloGanadas.map((subasta) => construirRegistro(subasta, null, usuarioId))
    ];

    registros.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

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

//====================================
// PERFIL DEL USUARIO
//====================================

const mostrarVistaPerfil = capturarAsincrono(async (req, res) => {
    const usuario = await Usuario.findByPk(req.usuario.id, {
        attributes: ["id", "nombre", "correo", "rol"]
    });

    if (!usuario) {
        return res.status(404).render("paginas/inicio", {
            titulo: "Usuario no encontrado",
            mensajeError: "No se encontró el usuario solicitado."
        });
    }

    return res.render("paginas/perfil", {
        titulo: "Mi Perfil - SubastasPro",
        paginaActual: "perfil",
        usuario: usuarioPublico(usuario)
    });
});

const obtenerPerfil = capturarAsincrono(async (req, res) => {
    const usuario = await Usuario.findByPk(req.usuario.id, {
        attributes: ["id", "nombre", "correo", "rol"]
    });

    if (!usuario) {
        return responderError(res, 404, "Usuario no encontrado.");
    }

    return responderExito(res, 200, "Perfil obtenido correctamente.", {
        usuario: usuarioPublico(usuario)
    });
});

const actualizarPerfil = capturarAsincrono(async (req, res) => {
    const { nombre, clave } = req.body || {};
    const camposActualizados = {};

    if (nombre !== undefined) {
        const nombreLimpio = String(nombre).trim();

        if (nombreLimpio.length < 3 || nombreLimpio.length > 120) {
            return responderError(res, 400, "Datos inválidos.", {
                nombre: "El nombre debe tener entre 3 y 120 caracteres."
            });
        }

        camposActualizados.nombre = nombreLimpio;
    }

    if (clave !== undefined && String(clave).trim() !== "") {
        const claveLimpia = String(clave).trim();

        if (claveLimpia.length < CLAVE_LONGITUD_MINIMA) {
            return responderError(res, 400, "Datos inválidos.", {
                clave: `La nueva contraseña debe tener al menos ${CLAVE_LONGITUD_MINIMA} caracteres.`
            });
        }

        const sal = await bcrypt.genSalt(RONDAS_SAL);
        camposActualizados.clave = await bcrypt.hash(claveLimpia, sal);
    }

    if (Object.keys(camposActualizados).length === 0) {
        return responderError(res, 400, "No se enviaron datos para actualizar.");
    }

    const [filasActualizadas] = await Usuario.update(camposActualizados, {
        where: { id: req.usuario.id }
    });

    if (filasActualizadas === 0) {
        return responderError(res, 404, "Usuario no encontrado.");
    }

    const usuarioActualizado = await Usuario.findByPk(req.usuario.id, {
        attributes: ["id", "nombre", "correo", "rol"]
    });

    return responderExito(res, 200, "Perfil actualizado correctamente.", {
        usuario: usuarioPublico(usuarioActualizado)
    });
});

//====================================
// TOGGLE FAVORITO (WATCHLIST)
// POST /api/usuario/favoritos/:subastaId
//====================================

const toggleFavorito = capturarAsincrono(async (req, res) => {
    const usuarioId = req.usuario.id;
    const { subastaId } = req.params;

    if (!subastaId) {
        return responderError(res, 400, "ID de subasta requerido.");
    }

    // Verificar que la subasta existe
    const subasta = await Subasta.findByPk(subastaId);
    if (!subasta) {
        return responderError(res, 404, "Subasta no encontrada.");
    }

    // Buscar si ya existe el favorito
    const existente = await Favorito.findOne({
        where: { usuario_id: usuarioId, subasta_id: subastaId }
    });

    if (existente) {
        await existente.destroy();
        return responderExito(res, 200, "Subasta removida de favoritos.", { favorito: false });
    }

    await Favorito.create({ usuario_id: usuarioId, subasta_id: subastaId });
    return responderExito(res, 201, "Subasta añadida a favoritos.", { favorito: true });
});

//====================================
// OBTENER IDS DE FAVORITOS DEL USUARIO
// GET /api/usuario/favoritos
//====================================

const obtenerFavoritos = capturarAsincrono(async (req, res) => {
    const favoritos = await Favorito.findAll({
        where: { usuario_id: req.usuario.id },
        attributes: ["subasta_id"]
    });

    const ids = favoritos.map(f => f.subasta_id);
    return responderExito(res, 200, "Favoritos obtenidos.", { favoritosIds: ids });
});

module.exports = {
    ESTADOS_HISTORIAL,
    obtenerHistorialUsuario,
    mostrarVistaPerfil,
    obtenerPerfil,
    actualizarPerfil,
    toggleFavorito,
    obtenerFavoritos
};
