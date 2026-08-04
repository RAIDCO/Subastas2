// Rutas de API para administración y aprobación de subastas
const express = require("express");
const router = express.Router();

const {
    obtenerSubastasPendientes,
    aprobarSubasta,
    rechazarSubasta
} = require("../controladores/administradorControlador");

/**
 * Obtener todas las subastas pendientes.
 */
router.get(
    "/pendientes",
    obtenerSubastasPendientes
);

/**
 * Aprobar una subasta.
 */
router.put(
    "/aprobar/:id",
    aprobarSubasta
);

/**
 * Rechazar una subasta.
 */
router.put(
    "/rechazar/:id",
    rechazarSubasta
);

module.exports = router;