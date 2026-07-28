const express = require("express");
const path = require("path");

const vistasRutas = require("./rutas/vistasRutas");

const app = express();

// Configuración del motor de plantillas Pug
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "vistas"));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "publico")));

// Rutas
app.use("/", vistasRutas);

// Error 404
app.use((req, res) => {
    res.status(404).render("paginas/inicio", {
        titulo: "Página no encontrada",
        mensajeError: "La página que buscas no existe."
    });
});

// Error 500
app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).render("paginas/inicio", {
        titulo: "Error del servidor",
        mensajeError: "Ha ocurrido un error interno."
    });
});

module.exports = app;