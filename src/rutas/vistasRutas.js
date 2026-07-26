const express = require('express');
const router = express.Router();

// Ruta principal inicial (Página de inicio)
router.get('/', (req, res) => {
  res.render('paginas/inicio', {
    titulo: 'Inicio - Subastas'
  });
});

module.exports = router;
