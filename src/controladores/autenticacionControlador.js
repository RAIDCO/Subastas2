// Controlador para el registro, inicio de sesión y gestión de JWT de usuarios
const bcrypt = require("bcryptjs");

const { Usuario } = require("../modelos");

const {
    ROLES,
    CLAVE_LONGITUD_MINIMA,
    RONDAS_SAL
} = require("../utilidades/constantes");

const {
    responderExito,
    responderError,
    capturarAsincrono
} = require("../utilidades/manejadorErrores");

const {
    generarToken,
    enviarCookieToken,
    limpiarCookieToken
} = require("../utilidades/tokenJwt");

//====================================
// VALIDACIONES
//====================================

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Normaliza el correo para evitar duplicados por mayúsculas o espacios
const normalizarCorreo = (correo) => String(correo).trim().toLowerCase();

const validarRegistro = ({ nombre, correo, clave }) => {
    const errores = {};

    if (!nombre || String(nombre).trim().length < 3) {
        errores.nombre = "El nombre debe tener al menos 3 caracteres.";
    } else if (String(nombre).trim().length > 120) {
        errores.nombre = "El nombre no puede superar los 120 caracteres.";
    }

    if (!correo || !FORMATO_CORREO.test(normalizarCorreo(correo))) {
        errores.correo = "Debes ingresar un correo electrónico válido.";
    }

    if (!clave || String(clave).length < CLAVE_LONGITUD_MINIMA) {
        errores.clave = `La contraseña debe tener al menos ${CLAVE_LONGITUD_MINIMA} caracteres.`;
    }

    return errores;
};

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
// REGISTRAR USUARIO
// POST /api/autenticacion/registro
//====================================

const registrarUsuario = capturarAsincrono(async (req, res) => {
    const { nombre, correo, clave } = req.body || {};

    const errores = validarRegistro({ nombre, correo, clave });

    if (Object.keys(errores).length > 0) {
        return responderError(res, 400, "Datos de registro inválidos.", errores);
    }

    const correoNormalizado = normalizarCorreo(correo);

    const existente = await Usuario.findOne({
        where: { correo: correoNormalizado }
    });

    if (existente) {
        return responderError(res, 409, "El correo ya está registrado.", {
            correo: "Este correo ya tiene una cuenta asociada."
        });
    }

    // Encriptar la contraseña antes de guardarla
    const sal = await bcrypt.genSalt(RONDAS_SAL);
    const claveEncriptada = await bcrypt.hash(String(clave), sal);

    const usuario = await Usuario.create({
        nombre: String(nombre).trim(),
        correo: correoNormalizado,
        clave: claveEncriptada,
        // El rol nunca se toma del body: siempre se crea como usuario normal
        rol: ROLES.USUARIO
    });

    const token = generarToken(usuario);

    enviarCookieToken(res, token);

    return responderExito(res, 201, "Cuenta creada correctamente.", {
        usuario: usuarioPublico(usuario),
        token
    });
});

//====================================
// INICIAR SESIÓN
// POST /api/autenticacion/login
//====================================

const iniciarSesion = capturarAsincrono(async (req, res) => {
    const { correo, clave } = req.body || {};

    if (!correo || !clave) {
        return responderError(res, 400, "Debes ingresar correo y contraseña.", {
            correo: !correo ? "El correo es obligatorio." : undefined,
            clave: !clave ? "La contraseña es obligatoria." : undefined
        });
    }

    const usuario = await Usuario.findOne({
        where: { correo: normalizarCorreo(correo) }
    });

    // Mismo mensaje para correo inexistente y clave incorrecta,
    // así no se revela qué correos están registrados.
    const credencialesInvalidas = () =>
        responderError(res, 401, "Correo o contraseña incorrectos.");

    if (!usuario) {
        return credencialesInvalidas();
    }

    const claveCoincide = await bcrypt.compare(String(clave), usuario.clave);

    if (!claveCoincide) {
        return credencialesInvalidas();
    }

    if (usuario.activo === false) {
        return responderError(
            res,
            403,
            "Tu cuenta está desactivada. Contacta con un administrador."
        );
    }

    const token = generarToken(usuario);

    enviarCookieToken(res, token);

    return responderExito(res, 200, "Sesión iniciada correctamente.", {
        usuario: usuarioPublico(usuario),
        token
    });
});

//====================================
// CERRAR SESIÓN
// POST /api/autenticacion/logout
//====================================

const cerrarSesion = (req, res) => {
    limpiarCookieToken(res);

    return responderExito(res, 200, "Sesión cerrada correctamente.");
};

//====================================
// PERFIL DEL USUARIO AUTENTICADO
// GET /api/autenticacion/perfil  (ruta protegida)
//====================================

const obtenerPerfil = capturarAsincrono(async (req, res) => {
    const usuario = await Usuario.findByPk(req.usuario.id, {
        attributes: ["id", "nombre", "correo", "rol", "activo"]
    });

    if (!usuario) {
        return responderError(res, 404, "El usuario ya no existe.");
    }

    return responderExito(res, 200, "Perfil obtenido correctamente.", {
        usuario: usuarioPublico(usuario)
    });
});

module.exports = {
    registrarUsuario,
    iniciarSesion,
    cerrarSesion,
    obtenerPerfil
};
