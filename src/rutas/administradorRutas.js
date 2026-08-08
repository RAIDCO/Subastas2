// Rutas de API para administración y aprobación de subastas
const express = require("express");
const router = express.Router();

const {
    obtenerSubastasPendientes,
    aprobarSubasta,
    rechazarSubasta
} = require("../controladores/administradorControlador");

const {
    verificarAutenticacion,
    requiereAdmin
} = require("../intermediarios/autenticacionIntermediario");

// Todas las rutas de admin requieren autenticación + rol administrador
router.use(verificarAutenticacion, requiereAdmin);

/**
 * Obtener todas las subastas pendientes.
 */
router.get("/pendientes", obtenerSubastasPendientes);

/**
 * Aprobar una subasta (soporta POST y PUT).
 */
router.post("/aprobar/:id", aprobarSubasta);
router.put("/aprobar/:id", aprobarSubasta);

/**
 * Rechazar una subasta (soporta POST y PUT).
 */
router.post("/rechazar/:id", rechazarSubasta);
router.put("/rechazar/:id", rechazarSubasta);

module.exports = router;