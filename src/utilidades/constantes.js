// Constantes globales de la aplicación (estados de subasta, roles, etc.)

//====================================
// ROLES DE USUARIO
//====================================

const ROLES = {
    USUARIO: "usuario",
    ADMINISTRADOR: "administrador"
};

const LISTA_ROLES = Object.values(ROLES);

//====================================
// AUTENTICACIÓN
//====================================

// Nombre de la cookie donde se guarda el token JWT
const COOKIE_TOKEN = "token";

// Longitud mínima exigida a la contraseña en el registro
const CLAVE_LONGITUD_MINIMA = 8;

// Número de rondas de sal usadas por bcryptjs
const RONDAS_SAL = 10;

module.exports = {
    ROLES,
    LISTA_ROLES,
    COOKIE_TOKEN,
    CLAVE_LONGITUD_MINIMA,
    RONDAS_SAL
};
