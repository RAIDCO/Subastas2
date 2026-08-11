// Controlador de autenticación (registro, inicio/cierre de sesión, verificación Gmail OTP y recuperación de contraseña)
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const { Usuario, CodigoVerificacion } = require("../modelos");
const { enviarCodigoVerificacion, enviarCodigoRecuperacion } = require("../servicios/correoServicio");

const {
    ROLES,
    CLAVE_LONGITUD_MINIMA,
    RONDAS_SAL
} = require("../utilidades/constantes");

const {
    generarToken,
    enviarCookieToken,
    limpiarCookieToken
} = require("../utilidades/tokenJwt");

const {
    responderExito,
    responderError,
    capturarAsincrono
} = require("../utilidades/manejadorErrores");

const normalizarCorreo = (correo) => String(correo).toLowerCase().trim();

const esCorreoValido = (correo) => {
    const expresion = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return expresion.test(correo);
};

const esGmail = (correo) => {
    const correoNorm = normalizarCorreo(correo);
    return correoNorm.endsWith("@gmail.com") || correoNorm.endsWith("@googlemail.com");
};

const usuarioPublico = (usuario) => ({
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol
});

//====================================
// SOLICITAR CÓDIGO DE VERIFICACIÓN GMAIL PARA REGISTRO
// POST /api/autenticacion/solicitar-codigo
//====================================

const solicitarCodigoRegistro = capturarAsincrono(async (req, res) => {
    const { correo } = req.body || {};

    if (!correo || !esCorreoValido(correo)) {
        return responderError(res, 400, "Ingresa un correo electrónico válido.");
    }

    if (!esGmail(correo)) {
        return responderError(res, 400, "Debes ingresar una dirección de correo Gmail válida (@gmail.com).");
    }

    const correoNormalizado = normalizarCorreo(correo);

    // Verificar si la cuenta ya existe
    const usuarioExiste = await Usuario.findOne({
        where: { correo: correoNormalizado }
    });

    if (usuarioExiste) {
        return responderError(
            res,
            409,
            "Ya existe una cuenta registrada con este correo electrónico."
        );
    }

    // Verificar si se solicitó un código recientemente (cooldown de 60 segundos)
    const registroExistente = await CodigoVerificacion.findOne({
        where: { correo: correoNormalizado }
    });

    if (registroExistente && registroExistente.ultimo_envio) {
        const segundosTranscurridos = Math.floor((Date.now() - new Date(registroExistente.ultimo_envio).getTime()) / 1000);
        if (segundosTranscurridos < 60) {
            const segundosRestantes = 60 - segundosTranscurridos;
            return responderError(
                res,
                429,
                `Por favor espera ${segundosRestantes} segundos antes de solicitar otro código.`
            );
        }
    }

    // Generar código OTP numérico de 6 dígitos aleatorio seguro
    const codigo = crypto.randomInt(100000, 999999).toString();
    const expiraEn = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos de validez

    if (registroExistente) {
        registroExistente.codigo = codigo;
        registroExistente.expira_en = expiraEn;
        registroExistente.intentos = 0;
        registroExistente.ultimo_envio = new Date();
        await registroExistente.save();
    } else {
        await CodigoVerificacion.create({
            correo: correoNormalizado,
            codigo,
            expira_en: expiraEn,
            intentos: 0,
            ultimo_envio: new Date()
        });
    }

    // Enviar el correo electrónico con el código OTP
    await enviarCodigoVerificacion(correoNormalizado, codigo);

    return responderExito(res, 200, "Código de verificación enviado a tu Gmail.");
});

//====================================
// REGISTRO DE USUARIO (CON VERIFICACIÓN DE CÓDIGO)
// POST /api/autenticacion/registro
//====================================

const registrarUsuario = capturarAsincrono(async (req, res) => {
    const { nombre, correo, clave, codigo } = req.body || {};

    const errores = {};

    if (!nombre || String(nombre).trim().length < 3) {
        errores.nombre = "El nombre debe tener al menos 3 caracteres.";
    }

    if (!correo || !esCorreoValido(correo)) {
        errores.correo = "Ingresa un correo electrónico válido.";
    } else if (!esGmail(correo)) {
        errores.correo = "Debes registrarte con un correo de Gmail (@gmail.com).";
    }

    if (!clave || String(clave).length < CLAVE_LONGITUD_MINIMA) {
        errores.clave = `La contraseña debe tener al menos ${CLAVE_LONGITUD_MINIMA} caracteres.`;
    }

    if (!codigo || String(codigo).trim().length !== 6) {
        errores.codigo = "Ingresa el código de 6 dígitos enviado a tu Gmail.";
    }

    if (Object.keys(errores).length > 0) {
        return responderError(res, 400, "Datos de registro inválidos.", errores);
    }

    const correoNormalizado = normalizarCorreo(correo);

    // Verificar si el usuario ya fue creado
    const usuarioExiste = await Usuario.findOne({
        where: { correo: correoNormalizado }
    });

    if (usuarioExiste) {
        return responderError(
            res,
            409,
            "Ya existe una cuenta con este correo electrónico."
        );
    }

    // Buscar y validar el código de verificación
    const registroCodigo = await CodigoVerificacion.findOne({
        where: { correo: correoNormalizado }
    });

    if (!registroCodigo) {
        return responderError(
            res,
            400,
            "No se ha solicitado ningún código de verificación para este correo."
        );
    }

    if (new Date(registroCodigo.expira_en).getTime() < Date.now()) {
        return responderError(
            res,
            400,
            "El código de verificación ha expirado. Por favor solicita uno nuevo."
        );
    }

    if (registroCodigo.intentos >= 5) {
        return responderError(
            res,
            429,
            "Has superado el número máximo de intentos. Solicita un nuevo código."
        );
    }

    if (registroCodigo.codigo !== String(codigo).trim()) {
        registroCodigo.intentos += 1;
        await registroCodigo.save();
        return responderError(res, 400, "El código de verificación es incorrecto.");
    }

    // Código válido: proceder a crear el usuario y eliminar el registro del código
    await registroCodigo.destroy();

    const sal = await bcrypt.genSalt(RONDAS_SAL);
    const claveHasheada = await bcrypt.hash(String(clave), sal);

    const nuevoUsuario = await Usuario.create({
        nombre: String(nombre).trim(),
        correo: correoNormalizado,
        clave: claveHasheada,
        rol: ROLES.USUARIO
    });

    const token = generarToken(nuevoUsuario);

    enviarCookieToken(res, token);

    return responderExito(res, 201, "Cuenta creada y verificada correctamente.", {
        usuario: usuarioPublico(nuevoUsuario),
        token
    });
});

//====================================
// SOLICITAR CÓDIGO DE RECUPERACIÓN DE CONTRASEÑA
// POST /api/autenticacion/solicitar-recuperacion
//====================================

const solicitarCodigoRecuperacion = capturarAsincrono(async (req, res) => {
    const { correo } = req.body || {};

    if (!correo || !esCorreoValido(correo)) {
        return responderError(res, 400, "Ingresa un correo electrónico válido.");
    }

    const correoNormalizado = normalizarCorreo(correo);

    // Verificar si el correo existe en la base de datos
    const usuario = await Usuario.findOne({
        where: { correo: correoNormalizado }
    });

    if (!usuario) {
        return responderError(
            res,
            404,
            "No existe ninguna cuenta registrada con este correo electrónico."
        );
    }

    if (usuario.activo === false) {
        return responderError(
            res,
            403,
            "Tu cuenta está desactivada. Contacta con un administrador."
        );
    }

    // Verificar cooldown de 60 segundos
    const registroExistente = await CodigoVerificacion.findOne({
        where: { correo: correoNormalizado }
    });

    if (registroExistente && registroExistente.ultimo_envio) {
        const segundosTranscurridos = Math.floor((Date.now() - new Date(registroExistente.ultimo_envio).getTime()) / 1000);
        if (segundosTranscurridos < 60) {
            const segundosRestantes = 60 - segundosTranscurridos;
            return responderError(
                res,
                429,
                `Por favor espera ${segundosRestantes} segundos antes de solicitar otro código.`
            );
        }
    }

    // Generar código OTP numérico de 6 dígitos aleatorio seguro
    const codigo = crypto.randomInt(100000, 999999).toString();
    const expiraEn = new Date(Date.now() + 10 * 60 * 1000);

    if (registroExistente) {
        registroExistente.codigo = codigo;
        registroExistente.expira_en = expiraEn;
        registroExistente.intentos = 0;
        registroExistente.ultimo_envio = new Date();
        await registroExistente.save();
    } else {
        await CodigoVerificacion.create({
            correo: correoNormalizado,
            codigo,
            expira_en: expiraEn,
            intentos: 0,
            ultimo_envio: new Date()
        });
    }

    // Enviar correo de recuperación
    await enviarCodigoRecuperacion(correoNormalizado, codigo);

    return responderExito(res, 200, "Código de recuperación enviado a tu correo.");
});

//====================================
// RESTABLECER CONTRASEÑA CON CÓDIGO OTP
// POST /api/autenticacion/restablecer-clave
//====================================

const restablecerClaveConCodigo = capturarAsincrono(async (req, res) => {
    const { correo, codigo, nuevaClave } = req.body || {};

    const errores = {};

    if (!correo || !esCorreoValido(correo)) {
        errores.correo = "Ingresa un correo electrónico válido.";
    }

    if (!codigo || String(codigo).trim().length !== 6) {
        errores.codigo = "Ingresa el código de 6 dígitos enviado a tu correo.";
    }

    if (!nuevaClave || String(nuevaClave).length < CLAVE_LONGITUD_MINIMA) {
        errores.nuevaClave = `La nueva contraseña debe tener al menos ${CLAVE_LONGITUD_MINIMA} caracteres.`;
    }

    if (Object.keys(errores).length > 0) {
        return responderError(res, 400, "Datos de recuperación inválidos.", errores);
    }

    const correoNormalizado = normalizarCorreo(correo);

    const usuario = await Usuario.findOne({
        where: { correo: correoNormalizado }
    });

    if (!usuario) {
        return responderError(res, 404, "No existe ninguna cuenta con este correo electrónico.");
    }

    const registroCodigo = await CodigoVerificacion.findOne({
        where: { correo: correoNormalizado }
    });

    if (!registroCodigo) {
        return responderError(
            res,
            400,
            "No se ha solicitado ningún código de recuperación para este correo."
        );
    }

    if (new Date(registroCodigo.expira_en).getTime() < Date.now()) {
        return responderError(
            res,
            400,
            "El código de recuperación ha expirado. Por favor solicita uno nuevo."
        );
    }

    if (registroCodigo.intentos >= 5) {
        return responderError(
            res,
            429,
            "Has superado el número máximo de intentos. Solicita un nuevo código."
        );
    }

    if (registroCodigo.codigo !== String(codigo).trim()) {
        registroCodigo.intentos += 1;
        await registroCodigo.save();
        return responderError(res, 400, "El código de recuperación es incorrecto.");
    }

    // Código válido: eliminar registro de verificación y actualizar contraseña
    await registroCodigo.destroy();

    const sal = await bcrypt.genSalt(RONDAS_SAL);
    const claveHasheada = await bcrypt.hash(String(nuevaClave), sal);

    usuario.clave = claveHasheada;
    await usuario.save();

    return responderExito(res, 200, "Contraseña restablecida correctamente. Ya puedes iniciar sesión.");
});

//====================================
// INICIO DE SESIÓN
// POST /api/autenticacion/login
//====================================

const iniciarSesion = capturarAsincrono(async (req, res) => {
    const { correo, clave, recordarme } = req.body || {};

    if (!correo || !clave) {
        return responderError(res, 400, "Debes ingresar correo y contraseña.", {
            correo: !correo ? "El correo es obligatorio." : undefined,
            clave: !clave ? "La contraseña es obligatoria." : undefined
        });
    }

    const usuario = await Usuario.findOne({
        where: { correo: normalizarCorreo(correo) }
    });

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

    const esRecordar = Boolean(recordarme);
    const token = generarToken(usuario, esRecordar);

    enviarCookieToken(res, token, esRecordar);

    return responderExito(res, 200, "Sesión iniciada correctamente.", {
        usuario: usuarioPublico(usuario),
        token
    });
});

//====================================
// CERRAR SESIÓN
// POST/GET /api/autenticacion/logout
//====================================

const cerrarSesion = (req, res) => {
    limpiarCookieToken(res);

    if (req.method === "GET" || (req.headers["accept"] && req.headers["accept"].includes("text/html"))) {
        return res.redirect("/iniciar-sesion");
    }

    return responderExito(res, 200, "Sesión cerrada correctamente.");
};

//====================================
// PERFIL DEL USUARIO AUTENTICADO
// GET /api/autenticacion/perfil
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
    solicitarCodigoRegistro,
    registrarUsuario,
    solicitarCodigoRecuperacion,
    restablecerClaveConCodigo,
    iniciarSesion,
    cerrarSesion,
    obtenerPerfil
};
