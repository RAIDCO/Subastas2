// Controlador para la gestión del perfil de usuario y sus subastas creadas/ganada// Controlador para la gestión del perfil de usuario y sus subastas creadas/ganadas

const bcrypt = require("bcryptjs");

const { Usuario } = require("../modelos");

const {
    CLAVE_LONGITUD_MINIMA,
    RONDAS_SAL
} = require("../utilidades/constantes");

const {
    responderExito,
    responderError,
    capturarAsincrono
} = require("../utilidades/manejadorErrores");

//====================================
// DATOS PÚBLICOS DEL USUARIO
// Nunca se devuelve el hash de la contraseña al cliente.
//====================================

const usuarioPublico = (usuario) => ({
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol
});

//====================================
// GET /perfil
// Renderiza la vista de perfil con los datos del usuario autenticado.
// Requiere verificarAutenticacion, que llena req.usuario.
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

//====================================
// GET /api/usuario/perfil
// Obtiene la información del usuario logueado mediante req.usuario.id.
//====================================

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

//====================================
// PUT /api/usuario/perfil
// Recibe los campos a actualizar del formulario, valida el nombre y/o
// encripta la nueva contraseña si fue modificada, actualizando la BD.
//====================================

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

module.exports = {
    mostrarVistaPerfil,
    obtenerPerfil,
    actualizarPerfil
};
