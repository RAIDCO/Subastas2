require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./src/aplicacion");
const { testConnection } = require("./src/configuracion/baseDeDatos");

// Cargar todos los modelos y sus relaciones
require("./src/modelos");

// Probar la conexión con la base de datos
testConnection();

// Crear servidor HTTP
const server = http.createServer(app);

// Inicializar Socket.io
const io = new Server(server);

// Evento cuando un cliente se conecta
io.on("connection", (socket) => {
    console.log("[Socket.io] Cliente conectado por WebSocket.");

    socket.on("disconnect", () => {
        console.log("[Socket.io] Cliente desconectado.");
    });
});

// Puerto del servidor
const PORT = process.env.PUERTO || process.env.PORT || 3000;

// Iniciar el servidor
server.listen(PORT, () => {
    console.log("=======================================");
    console.log(" Sistema de Subastas iniciado");
    console.log(` Servidor: http://localhost:${PORT}`);
    console.log(` Entorno: ${process.env.NODE_ENV}`);
    console.log("=======================================");
});