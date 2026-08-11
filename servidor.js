require("dotenv").config();
const dns = require("dns");
try { dns.setDefaultResultOrder("ipv4first"); } catch (e) {}

const http = require("http");
const { Server } = require("socket.io");

const app = require("./src/aplicacion");
const { testConnection } = require("./src/configuracion/baseDeDatos");
const configurarSockets = require("./src/sockets/subastaSocket");

// Cargar todos los modelos y sus relaciones
require("./src/modelos");

// Probar la conexión con la base de datos
testConnection();

// Crear servidor HTTP
const server = http.createServer(app);

// Inicializar Socket.io
const io = new Server(server);

// Configurar los eventos de Socket.io para pujas en tiempo real
configurarSockets(io);

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