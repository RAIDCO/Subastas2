// Rutas de API para la creación de subastas
const express = require("express");
const router = express.Router();

const { crearSubasta } = require("../controladores/subastaControlador");
const { verificarAutenticacion } = require("../intermediarios/autenticacionIntermediario");
const { subirImagenesGaleria } = require("../configuracion/multerConfig");

/**
 * Crear una nueva subasta (requiere autenticación + imágenes opcionales).
 * POST /api/subastas
 */
router.post("/", verificarAutenticacion, subirImagenesGaleria, crearSubasta);

module.exports = router;
