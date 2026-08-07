const { Router } = require('express');
const { obtenerCategorias } = require('../controladores/categoriaControlador.js');

const router = Router();

router.get('/categorias', obtenerCategorias);

module.exports = router;