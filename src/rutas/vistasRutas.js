const express = require('express');
const router = express.Router();

// Ruta principal / Landing Page
router.get('/', (req, res) => {
  res.render('paginas/inicio', {
    titulo: 'Inicio - SubastasPro'
  });
});

// Catálogo de subastas activas
router.get('/subastas', (req, res) => {
  // TODO: Obtener subastas de la BD cuando los modelos estén listos
  res.render('paginas/subastas', {
    titulo: 'Subastas Activas - SubastasPro',
    paginaActual: 'subastas',
    subastas: [],
    usuario: null
  });
});

// Detalle de una subasta individual
router.get('/subastas/:id', (req, res) => {
  // TODO: Buscar subasta por ID en la BD
  res.render('paginas/detalle-subasta', {
    titulo: 'Detalle de Subasta - SubastasPro',
    paginaActual: 'subastas',
    subasta: null,
    usuario: null
  });
});

// Historial de subastas del usuario
router.get('/historial', (req, res) => {
  // TODO: Obtener historial de subastas del usuario autenticado
  res.render('paginas/historial', {
    titulo: 'Mi Historial - SubastasPro',
    paginaActual: 'historial',
    historial: [],
    usuario: null
  });
});

module.exports = router;
