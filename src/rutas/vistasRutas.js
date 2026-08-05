const express = require('express');
const router = express.Router();

const { requiereSesionVista } = require('../intermediarios/autenticacionIntermediario');
const { obtenerHistorialUsuario } = require('../controladores/usuarioControlador');

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

// Historial de subastas 
router.get('/historial', cargarUsuarioSiExiste, obtenerHistorialUsuario);

// Vista de iniciar sesión (soporta /iniciar-sesion y /login)
router.get(['/iniciar-sesion', '/login'], (req, res) => {
  res.render('paginas/iniciar-sesion', {
    titulo: 'Iniciar Sesión - SubastasPro'
  });
});

// Vista de registro
router.get('/registro', (req, res) => {
  res.render('paginas/registro', {
    titulo: 'Registro de Usuario - SubastasPro'
  });
});

module.exports = router;