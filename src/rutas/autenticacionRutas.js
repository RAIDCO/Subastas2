// Rutas de API para registro, inicio y cierre de sesión
const express = require("express");

const {
    solicitarCodigoRegistro,
    registrarUsuario,
    iniciarSesion,
    cerrarSesion,
    obtenerPerfil
} = require("../controladores/autenticacionControlador");

const {
    verificarAutenticacion
} = require("../intermediarios/autenticacionIntermediario");

const router = express.Router();

//====================================
// RUTAS PÚBLICAS
//====================================

// POST /api/autenticacion/solicitar-codigo
router.post("/solicitar-codigo", solicitarCodigoRegistro);

// POST /api/autenticacion/registro
router.post("/registro", registrarUsuario);

// POST /api/autenticacion/login
router.post("/login", iniciarSesion);

// POST y GET /api/autenticacion/logout (cerrar sesión)
router.post("/logout", cerrarSesion);
router.get("/logout", cerrarSesion);

//====================================
// RUTAS PROTEGIDAS
//====================================

// GET /api/autenticacion/perfil
router.get("/perfil", verificarAutenticacion, obtenerPerfil);

module.exports = router;
