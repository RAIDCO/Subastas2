const express = require('express');
const router = express.Router();
const { Subasta, Usuario, Categoria } = require('../modelos');

// Ruta principal / Landing Page
router.get('/', (req, res) => {
  res.render('paginas/inicio', {
    titulo: 'Inicio - SubastasPro'
  });
});

// Catálogo de subastas activas
router.get('/subastas', (req, res) => {
  res.render('paginas/subastas', {
    titulo: 'Subastas Activas - SubastasPro',
    paginaActual: 'subastas',
    subastas: [],
    usuario: null
  });
});

// Detalle de una subasta individual
router.get('/subastas/:id', (req, res) => {
  res.render('paginas/detalle-subasta', {
    titulo: 'Detalle de Subasta - SubastasPro',
    paginaActual: 'subastas',
    subasta: null,
    usuario: null
  });
});

// Historial de subastas del usuario
router.get('/historial', (req, res) => {
  res.render('paginas/historial', {
    titulo: 'Mi Historial - SubastasPro',
    paginaActual: 'historial',
    historial: [],
    usuario: null
  });
});

// Panel de administración (moderación de subastas pendientes)
router.get('/admin', async (req, res) => {
  try {
    const subastas = await Subasta.findAll({
      where: { estado: 'pendiente' },
      include: [
        { model: Usuario, attributes: ['id', 'nombre', 'correo'] },
        { model: Categoria, attributes: ['id', 'nombre'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.render('paginas/panel-admin', {
      titulo: 'Panel Admin - SubastasPro',
      paginaActual: 'admin',
      subastas,
      usuario: null
    });
  } catch (error) {
    res.render('paginas/panel-admin', {
      titulo: 'Panel Admin - SubastasPro',
      paginaActual: 'admin',
      subastas: [],
      usuario: null
    });
  }
});

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