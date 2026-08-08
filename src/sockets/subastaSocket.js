// Gestor de eventos Socket.io para pujas y temporizador en tiempo real
const { Subasta, Puja, Usuario } = require("../modelos");
const { verificarToken } = require("../utilidades/tokenJwt");
const {
    iniciarTemporizador,
    reiniciarTemporizador,
    obtenerTiempoRestante
} = require("../servicios/temporizadorSubastaServicio");

//====================================
// VALIDAR TOKEN JWT DESDE EL SOCKET
//====================================

const autenticarSocket = (token) => {
    if (!token) return null;

    try {
        return verificarToken(token);
    } catch {
        return null;
    }
};

//====================================
// CONFIGURAR EVENTOS DE SOCKET.IO
//====================================

const configurarSockets = (io) => {

    io.on("connection", (socket) => {
        console.log(`[Socket.io] Cliente conectado: ${socket.id}`);

        //------------------------------------
        // UNIRSE A UNA SALA DE SUBASTA
        //------------------------------------

        socket.on("subasta:unirse", async ({ subastaId }) => {
            if (!subastaId) {
                return socket.emit("subasta:error", { mensaje: "ID de subasta requerido." });
            }

            try {
                const subasta = await Subasta.findByPk(subastaId, {
                    include: [
                        { model: Usuario, as: "vendedor", attributes: ["id", "nombre"] },
                        { model: Usuario, as: "ganador", attributes: ["id", "nombre"] }
                    ]
                });

                if (!subasta) {
                    return socket.emit("subasta:error", { mensaje: "Subasta no encontrada." });
                }

                socket.join(`subasta:${subastaId}`);

                // Si la subasta está activa y no tiene temporizador corriendo, iniciar uno
                if (subasta.estado === "activa") {
                    const tiempoRestante = obtenerTiempoRestante(subastaId);

                    if (tiempoRestante <= 0) {
                        iniciarTemporizador(subastaId, subasta.tiempo_inactividad_minutos, io);
                    }
                }

                // Enviar el estado actual al cliente que se acaba de unir
                socket.emit("subasta:estado-actual", {
                    subastaId,
                    estado: subasta.estado,
                    precioActual: Number(subasta.precio_actual),
                    segundosRestantes: obtenerTiempoRestante(subastaId),
                    ganador: subasta.ganador ? { id: subasta.ganador.id, nombre: subasta.ganador.nombre } : null
                });

                // Enviar las últimas pujas al nuevo cliente
                const ultimasPujas = await Puja.findAll({
                    where: { subasta_id: subastaId },
                    include: [{ model: Usuario, as: "usuario", attributes: ["id", "nombre"] }],
                    order: [["created_at", "DESC"]],
                    limit: 20
                });

                socket.emit("subasta:historial-pujas", {
                    pujas: ultimasPujas.map((p) => ({
                        id: p.id,
                        monto: Number(p.monto),
                        usuario: p.usuario ? p.usuario.nombre : "Anónimo",
                        usuarioId: p.usuario_id,
                        fecha: p.created_at
                    }))
                });

            } catch (error) {
                console.error("[Socket.io] Error al unirse:", error.message);
                socket.emit("subasta:error", { mensaje: "Error al cargar la subasta." });
            }
        });

        //------------------------------------
        // REALIZAR UNA PUJA
        //------------------------------------

        socket.on("subasta:pujar", async ({ subastaId, monto, token }) => {
            // 1. Autenticar usuario
            const contenidoToken = autenticarSocket(token);

            if (!contenidoToken) {
                return socket.emit("subasta:error", { mensaje: "Debes iniciar sesión para pujar." });
            }

            // 2. Validar monto
            const montoNumerico = Number(monto);

            if (!montoNumerico || montoNumerico <= 0) {
                return socket.emit("subasta:error", { mensaje: "El monto de la puja no es válido." });
            }

            try {
                // 3. Buscar la subasta
                const subasta = await Subasta.findByPk(subastaId);

                if (!subasta) {
                    return socket.emit("subasta:error", { mensaje: "Subasta no encontrada." });
                }

                if (subasta.estado !== "activa") {
                    return socket.emit("subasta:error", { mensaje: "Esta subasta no está activa." });
                }

                // 4. No pujar en tu propia subasta
                if (subasta.usuario_id === contenidoToken.id) {
                    return socket.emit("subasta:error", { mensaje: "No puedes pujar en tu propia subasta." });
                }

                // 5. Validar que la puja sea al menos 5% mayor al precio actual
                const precioActual = Number(subasta.precio_actual);
                const pujaMinima = Math.round(precioActual * 1.05 * 100) / 100;

                if (montoNumerico < pujaMinima) {
                    return socket.emit("subasta:error", {
                        mensaje: `Tu puja debe ser de al menos $${pujaMinima.toFixed(2)} (incremento mínimo del 5%).`
                    });
                }

                // 6. Crear la puja en la BD
                const nuevaPuja = await Puja.create({
                    monto: montoNumerico,
                    subasta_id: subastaId,
                    usuario_id: contenidoToken.id
                });

                // 7. Actualizar el precio actual y la fecha de última puja
                subasta.precio_actual = montoNumerico;
                subasta.ultima_puja_at = new Date();
                await subasta.save();

                // 8. Reiniciar el temporizador de inactividad
                reiniciarTemporizador(subastaId, io);

                // 9. Obtener el nombre del usuario
                const usuario = await Usuario.findByPk(contenidoToken.id, {
                    attributes: ["id", "nombre"]
                });

                // 10. Broadcast a toda la sala
                const datosPuja = {
                    id: nuevaPuja.id,
                    monto: montoNumerico,
                    usuario: usuario ? usuario.nombre : "Anónimo",
                    usuarioId: contenidoToken.id,
                    fecha: nuevaPuja.created_at,
                    precioActual: montoNumerico,
                    segundosRestantes: obtenerTiempoRestante(subastaId)
                };

                io.to(`subasta:${subastaId}`).emit("subasta:nueva-puja", datosPuja);

                console.log(`[Socket.io] Puja de $${montoNumerico} en subasta ${subastaId} por ${usuario ? usuario.nombre : contenidoToken.id}`);

            } catch (error) {
                console.error("[Socket.io] Error al pujar:", error.message);
                socket.emit("subasta:error", { mensaje: "Error al procesar tu puja." });
            }
        });

        //------------------------------------
        // SALIR DE UNA SALA DE SUBASTA
        //------------------------------------

        socket.on("subasta:salir", ({ subastaId }) => {
            if (subastaId) {
                socket.leave(`subasta:${subastaId}`);
            }
        });

        //------------------------------------
        // DESCONEXIÓN
        //------------------------------------

        socket.on("disconnect", () => {
            console.log(`[Socket.io] Cliente desconectado: ${socket.id}`);
        });
    });
};

module.exports = configurarSockets;
