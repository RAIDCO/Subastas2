// Middleware para verificar que el usuario tenga rol de administrador
const { ROLES } = require("../utilidades/constantes");
const { responderError } = require("../utilidades/manejadorErrores");

//====================================
// ES ADMINISTRADOR
// Se debe usar SIEMPRE después de verificarAutenticacion,
// que es quien rellena req.usuario.
//====================================

const esAdministrador = (req, res, next) => {
    if (!req.usuario) {
        return responderError(
            res,
            401,
            "Debes iniciar sesión para acceder a este recurso."
        );
    }

    if (req.usuario.rol !== ROLES.ADMINISTRADOR) {
        return responderError(
            res,
            403,
            "No tienes permisos de administrador para realizar esta acción."
        );
    }

    return next();
};

module.exports = {
    esAdministrador
};
