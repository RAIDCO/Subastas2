// Rutas de API para gestión de perfil de usuarios

const express = require("express");
const router = express.Router();

const {
    mostrarVistaPerfil,
    obtenerPerfil,
    actualizarPerfil,
    toggleFavorito,
    obtenerFavoritos
} = require("../controladores/usuarioControlador");

const {
    verificarAutenticacion,
    requiereSesionVista
} = require("../intermediarios/autenticacionIntermediario");

// GET /perfil -> renderiza la vista perfil.pug
router.get("/perfil", requiereSesionVista, mostrarVistaPerfil);

// GET /api/usuario/perfil -> obtiene los datos del usuario logueado
router.get("/api/usuario/perfil", verificarAutenticacion, obtenerPerfil);

// PUT /api/usuario/perfil -> procesa la actualización de datos
router.put("/api/usuario/perfil", verificarAutenticacion, actualizarPerfil);

// POST /api/usuario/favoritos/:subastaId -> toggle favorito (añadir/quitar)
router.post("/api/usuario/favoritos/:subastaId", verificarAutenticacion, toggleFavorito);

// GET /api/usuario/favoritos -> obtiene los IDs de subastas favoritas
router.get("/api/usuario/favoritos", verificarAutenticacion, obtenerFavoritos);

module.exports = router;
