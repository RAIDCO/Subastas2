// Utilidades para firmar, verificar y transportar los tokens JWT
const jwt = require("jsonwebtoken");

const { COOKIE_TOKEN } = require("./constantes");

//====================================
// CONFIGURACIÓN
//====================================

// Se lee de forma perezosa para que dotenv ya haya cargado el .env
const obtenerSecreto = () => {
    const secreto = process.env.JWT_SECRETO;

    if (!secreto) {
        throw new Error(
            "Falta la variable de entorno JWT_SECRETO. Revisa tu archivo .env"
        );
    }

    return secreto;
};

const obtenerExpiracion = () => process.env.JWT_EXPIRACION || "24h";

//====================================
// FIRMAR TOKEN
// El token solo guarda datos públicos del usuario: nunca la clave.
//====================================

const generarToken = (usuario) => {
    const contenido = {
        id: usuario.id,
        correo: usuario.correo,
        rol: usuario.rol
    };

    return jwt.sign(contenido, obtenerSecreto(), {
        expiresIn: obtenerExpiracion()
    });
};

//====================================
// VERIFICAR TOKEN
// Lanza un error si el token es inválido o está expirado.
//====================================

const verificarToken = (token) => {
    return jwt.verify(token, obtenerSecreto());
};

//====================================
// EXTRAER TOKEN DE LA PETICIÓN
// Se acepta tanto la cabecera "Authorization: Bearer <token>"
// (peticiones fetch / API) como la cookie "token" (navegación normal).
//====================================

const leerCookies = (req) => {
    // Si el proyecto llega a usar cookie-parser, req.cookies ya viene listo
    if (req.cookies) {
        return req.cookies;
    }

    const cabecera = req.headers.cookie;

    if (!cabecera) {
        return {};
    }

    return cabecera.split(";").reduce((cookies, parte) => {
        const separador = parte.indexOf("=");

        if (separador > 0) {
            const nombre = parte.slice(0, separador).trim();
            const valor = parte.slice(separador + 1).trim();

            cookies[nombre] = decodeURIComponent(valor);
        }

        return cookies;
    }, {});
};

const extraerToken = (req) => {
    const autorizacion = req.headers.authorization || "";

    if (autorizacion.startsWith("Bearer ")) {
        const token = autorizacion.slice(7).trim();

        if (token) {
            return token;
        }
    }

    return leerCookies(req)[COOKIE_TOKEN] || null;
};

//====================================
// COOKIE DEL TOKEN
//====================================

const enviarCookieToken = (res, token) => {
    res.cookie(COOKIE_TOKEN, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "produccion",
        maxAge: 24 * 60 * 60 * 1000
    });
};

const limpiarCookieToken = (res) => {
    res.clearCookie(COOKIE_TOKEN, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "produccion"
    });
};

module.exports = {
    generarToken,
    verificarToken,
    extraerToken,
    enviarCookieToken,
    limpiarCookieToken
};
