const express = require('express');
const path = require('path');
const vistasRutas = require('./rutas/vistasRutas');

const app = express();

// Configuración del motor de plantillas Pug
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'vistas'));

// Middlewares estándar
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'publico')));

// Rutas de vistas
app.use('/', vistasRutas);

// Manejo de error 404
app.use((req, res) => {
  res.status(404).render('paginas/inicio', {
    titulo: 'Página No Encontrada',
    mensajeError: 'La página que buscas no existe.'
  });
});

module.exports = app;
