require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/aplicacion');

// Crear servidor HTTP y Socket.io
const server = http.createServer(app);
const io = new Server(server);

// Evento básico de Socket.io
io.on('connection', (socket) => {
  console.log('[Socket.io] Cliente conectado por WebSocket');
});

const PORT = process.env.PUERTO || process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Servidor iniciado y escuchando en http://localhost:${PORT}`);
});
