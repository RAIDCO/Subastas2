const express = require('express');
const router = express.Router();

// Ruta principal inicial (Página de inicio)
router.get('/', (req, res) => {
  res.render('paginas/inicio', {
    titulo: 'Inicio - Subastas'
  });
});

// Vista de iniciar sesión
router.get('/iniciar-sesion', (req, res) => {
  res.render('paginas/iniciar-sesion', {
    titulo: 'Iniciar Sesión'
  });
});

// Vista de registro
router.get('/registro', (req, res) => {
  res.render('paginas/registro', {
    titulo: 'Registro de Usuario'
  });
});

module.exports = router;