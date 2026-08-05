// Middleware para verificar token JWT en peticiones protegidas
const { Usuario } = require("../modelos");

const { responderError } = require("../utilidades/manejadorErrores");
const {
    extraerToken,
    verificarToken,
    limpiarCookieToken
} = require("../utilidades/tokenJwt");

//====================================
// VERIFICAR AUTENTICACIÓN
// Extrae el token de la cabecera Authorization o de la cookie,
// lo valida y deja el usuario disponible en req.usuario.
//====================================

const verificarAutenticacion = async (req, res, next) => {
    const token = extraerToken(req);

    if (!token) {
        return responderError(
            res,
            401,
            "Debes iniciar sesión para acceder a este recurso."
        );
    }

    let contenido;

    try {
        contenido = verificarToken(token);
    } catch (error) {
        // Token manipulado o expirado: se borra la cookie para no
        // reenviarlo en cada petición.
        limpiarCookieToken(res);

        const mensaje =
            error.name === "TokenExpiredError"
                ? "Tu sesión ha expirado. Inicia sesión de nuevo."
                : "Token inválido. Inicia sesión de nuevo.";

        return responderError(res, 401, mensaje);
    }

    try {
        // Se consulta la base de datos para que un usuario eliminado o
        // desactivado no siga entrando con un token todavía válido.
        const usuario = await Usuario.findByPk(contenido.id, {
            attributes: ["id", "nombre", "correo", "rol", "activo"]
        });

        if (!usuario) {
            limpiarCookieToken(res);

            return responderError(res, 401, "El usuario ya no existe.");
        }

        if (usuario.activo === false) {
            limpiarCookieToken(res);

            return responderError(res, 403, "Tu cuenta está desactivada.");
        }

        req.usuario = {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            rol: usuario.rol
        };

        return next();
    } catch (error) {
        return next(error);
    }
};

//====================================
// AUTENTICACIÓN OPCIONAL
// Útil para las vistas Pug: si hay sesión la carga, y si no,
// deja pasar la petición igualmente.
//====================================

const cargarUsuarioSiExiste = async (req, res, next) => {
    const token = extraerToken(req);

    if (!token) {
        return next();
    }

    try {
        const contenido = verificarToken(token);

        const usuario = await Usuario.findByPk(contenido.id, {
            attributes: ["id", "nombre", "correo", "rol", "activo"]
        });

        if (usuario && usuario.activo !== false) {
            req.usuario = {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol
            };

            // Disponible en las plantillas Pug como "usuarioActual"
            res.locals.usuarioActual = req.usuario;
        }
    } catch (error) {
        // Sin sesión válida se continúa como visitante anónimo
        limpiarCookieToken(res);
    }

    return next();
};

//====================================
// SESIÓN OBLIGATORIA EN VISTAS
// Hace lo mismo que verificarAutenticacion, pero pensado para las
// páginas Pug: en vez de responder un 401 en JSON (que el navegador
// mostraría como texto plano), manda al formulario de inicio de sesión.
//====================================

const requiereSesionVista = (req, res, next) => {
    cargarUsuarioSiExiste(req, res, () => {
        if (!req.usuario) {
            return res.redirect("/iniciar-sesion");
        }

        return next();
    });
};

module.exports = {
    verificarAutenticacion,
    cargarUsuarioSiExiste,
    requiereSesionVista
};
