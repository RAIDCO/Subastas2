// Rutas de API para la creación de subastas
const express = require("express");
const router = express.Router();

const { crearSubasta } = require("../controladores/subastaControlador");
const { verificarAutenticacion } = require("../intermediarios/autenticacionIntermediario");
const { subirImagen } = require("../configuracion/multerConfig");

/**
 * Crear una nueva subasta (requiere autenticación + imagen opcional).
 * POST /api/subastas
 */
router.post("/", verificarAutenticacion, subirImagen.single("imagen"), crearSubasta);

module.exports = router;
