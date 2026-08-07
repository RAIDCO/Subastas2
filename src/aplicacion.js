const express = require("express");
const path = require("path");

const vistasRutas = require("./rutas/vistasRutas");
const autenticacionRutas = require("./rutas/autenticacionRutas");
const categoriaRutas = require("./rutas/categoriaRutas");

const app = express();

// Configuración del motor de plantillas Pug
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "vistas"));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "publico")));

// Rutas
app.use("/api/autenticacion", autenticacionRutas);
app.use("/api", categoriaRutas);
app.use("/", vistasRutas);

// Error 404
app.use((req, res) => {
    if (req.path.startsWith("/api")) {
        return res.status(404).json({
            exito: false,
            mensaje: "Recurso no encontrado.",
            errores: null
        });
    }

    res.status(404).render("paginas/inicio", {
        titulo: "Página no encontrada",
        mensajeError: "La página que buscas no existe."
    });
});

// Error 500
app.use((err, req, res, next) => {
    console.error(err);

    const estado = err.estado || 500;

    if (req.path.startsWith("/api")) {
        return res.status(estado).json({
            exito: false,
            mensaje: err.estado ? err.message : "Ha ocurrido un error interno.",
            errores: err.errores || null
        });
    }

    res.status(estado).render("paginas/inicio", {
        titulo: "Error del servidor",
        mensajeError: "Ha ocurrido un error interno."
    });
});

module.exports = app;