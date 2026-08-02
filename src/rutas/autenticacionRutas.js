// Rutas de API para registro e inicio de sesión
const express = require("express");

const {
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

// POST /api/autenticacion/registro
router.post("/registro", registrarUsuario);

// POST /api/autenticacion/login
router.post("/login", iniciarSesion);

// POST /api/autenticacion/logout
router.post("/logout", cerrarSesion);

//====================================
// RUTAS PROTEGIDAS
//====================================

// GET /api/autenticacion/perfil
router.get("/perfil", verificarAutenticacion, obtenerPerfil);

module.exports = router;
