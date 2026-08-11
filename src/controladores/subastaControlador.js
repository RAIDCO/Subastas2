const { Subasta, Usuario, Categoria, Puja } = require("../modelos");
const { capturarAsincrono, responderExito, responderError } = require("../utilidades/manejadorErrores");
const { obtenerEstadoEfectivo } = require("../utilidades/fechas");

//====================================
// MOSTRAR DETALLE DE UNA SUBASTA
// GET /subastas/:id (vista Pug)
//====================================

const mostrarDetalleSubasta = capturarAsincrono(async (req, res) => {
    const { id } = req.params;

    const subasta = await Subasta.findByPk(id, {
        include: [
            { model: Usuario, as: "vendedor", attributes: ["id", "nombre", "correo"] },
            { model: Categoria, as: "categoria", attributes: ["id", "nombre"] },
            { model: Usuario, as: "ganador", attributes: ["id", "nombre"] },
            {
                model: Puja,
                as: "pujas",
                include: [{ model: Usuario, as: "usuario", attributes: ["id", "nombre"] }],
                order: [["created_at", "DESC"]],
                limit: 20
            }
        ]
    });

    if (!subasta) {
        return res.status(404).render("paginas/inicio", {
            titulo: "Subasta no encontrada",
            mensajeError: "La subasta que buscas no existe."
        });
    }

    // Formatear las pujas para la vista
    const pujasFormateadas = subasta.pujas
        ? subasta.pujas.map((p) => ({
              id: p.id,
              monto: Number(p.monto),
              usuario: p.usuario ? p.usuario.nombre : "Anónimo",
              usuarioId: p.usuario_id,
              fecha: p.created_at
          }))
        : [];

    const estadoEfectivo = obtenerEstadoEfectivo(subasta);

    return res.render("paginas/detalle-subasta", {
        titulo: `${subasta.titulo} - SubastasPro`,
        paginaActual: "subastas",
        subasta: {
            id: subasta.id,
            titulo: subasta.titulo,
            descripcion: subasta.descripcion,
            imagen_url: subasta.imagen_url,
            precio_inicial: Number(subasta.precio_inicial),
            precio_actual: Number(subasta.precio_actual),
            estado: subasta.estado,
            estadoEfectivo,
            tiempo_inactividad_minutos: subasta.tiempo_inactividad_minutos,
            fecha_inicio: subasta.fecha_inicio,
            fecha_fin: subasta.fecha_fin,
            fecha_cierre: subasta.fecha_cierre,
            ultima_puja_at: subasta.ultima_puja_at,
            vendedor: subasta.vendedor ? { id: subasta.vendedor.id, nombre: subasta.vendedor.nombre } : null,
            categoria: subasta.categoria ? { id: subasta.categoria.id, nombre: subasta.categoria.nombre } : null,
            ganador: subasta.ganador ? { id: subasta.ganador.id, nombre: subasta.ganador.nombre } : null
        },
        pujas: pujasFormateadas,
        usuario: req.usuario || null
    });
});

//====================================
// MOSTRAR FORMULARIO DE CREAR SUBASTA
// GET /crear-subasta (vista Pug)
//====================================

const mostrarFormularioCrear = capturarAsincrono(async (req, res) => {
    const categorias = await Categoria.findAll({
        attributes: ["id", "nombre"],
        order: [["nombre", "ASC"]]
    });

    return res.render("paginas/crear-subasta", {
        titulo: "Publicar Subasta - SubastasPro",
        paginaActual: "crear-subasta",
        categorias,
        usuario: req.usuario || null
    });
});

//====================================
// CREAR UNA NUEVA SUBASTA
// POST /api/subastas
//====================================

const crearSubasta = capturarAsincrono(async (req, res) => {
    const { titulo, descripcion, precio_inicial, tiempo_inactividad_minutos, categoria_id, inicio_delay_minutos, duracion_horas, imagen_url } = req.body;

    // Validaciones básicas
    if (!titulo || !descripcion || !precio_inicial || !categoria_id) {
        return responderError(res, 400, "Todos los campos obligatorios deben estar completos.", {
            titulo: !titulo ? "El título es obligatorio." : null,
            descripcion: !descripcion ? "La descripción es obligatoria." : null,
            precio_inicial: !precio_inicial ? "El precio inicial es obligatorio." : null,
            categoria_id: !categoria_id ? "La categoría es obligatoria." : null
        });
    }

    const precioNum = Number(precio_inicial);

    if (isNaN(precioNum) || precioNum < 0.01) {
        return responderError(res, 400, "El precio inicial debe ser al menos $0.01.");
    }

    const tituloLimpio = String(titulo).trim();

    if (tituloLimpio.length < 5 || tituloLimpio.length > 150) {
        return responderError(res, 400, "El título debe tener entre 5 y 150 caracteres.");
    }

    // Verificar que la categoría existe
    const categoria = await Categoria.findByPk(categoria_id);

    if (!categoria) {
        return responderError(res, 400, "La categoría seleccionada no existe.");
    }

    const minutos = Number(tiempo_inactividad_minutos) || 5;
    const delayMinutos = Number(inicio_delay_minutos) || 0;
    const duracion = Number(duracion_horas) || 24;

    // Imagen: si se subió un archivo (Cloudinary devuelve URL en req.file.path, multer local devuelve req.file.filename)
    let fileUrl = null;
    if (req.file) {
        fileUrl = (req.file.path && req.file.path.startsWith("http"))
            ? req.file.path
            : (req.file.filename ? `/uploads/${req.file.filename}` : req.file.path);
    }
    const webUrl = imagen_url ? String(imagen_url).trim() : "";
    const imagenFinal = fileUrl || (webUrl !== "" ? webUrl : null);

    // Fechas provisionales (se recalculan al aprobar la subasta)
    const fechaInicio = new Date(Date.now() + delayMinutos * 60 * 1000);
    const fechaFin = new Date(fechaInicio.getTime() + duracion * 60 * 60 * 1000);

    const nuevaSubasta = await Subasta.create({
        titulo: tituloLimpio,
        descripcion: String(descripcion).trim(),
        imagen_url: imagenFinal,
        precio_inicial: precioNum,
        precio_actual: precioNum,
        estado: "pendiente",
        tiempo_inactividad_minutos: minutos,
        inicio_delay_minutos: delayMinutos,
        duracion_horas: duracion,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        usuario_id: req.usuario.id,
        categoria_id
    });

    return responderExito(res, 201, "Subasta publicada correctamente. Un administrador la revisará pronto.", {
        subasta: {
            id: nuevaSubasta.id,
            titulo: nuevaSubasta.titulo,
            estado: nuevaSubasta.estado
        }
    });
});

module.exports = {
    mostrarDetalleSubasta,
    mostrarFormularioCrear,
    crearSubasta
};
