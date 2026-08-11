const { Subasta, Puja, Usuario, AutoPuja, MensajeChat } = require("../modelos");
const { verificarToken } = require("../utilidades/tokenJwt");
const { obtenerEstadoEfectivo } = require("../utilidades/fechas");
const {
    iniciarTemporizador,
    reiniciarTemporizador,
    obtenerTiempoRestante,
    asegurarEstadoTemporizador
} = require("../servicios/temporizadorSubastaServicio");
const { procesarAutoPujas } = require("../servicios/autoPujaServicio");

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

                const estadoEfectivo = obtenerEstadoEfectivo(subasta);
                const ahora = new Date();
                const fechaInicio = new Date(subasta.fecha_inicio);

                if (estadoEfectivo === "programada") {
                    const segundosParaInicio = Math.max(0, Math.ceil((fechaInicio.getTime() - ahora.getTime()) / 1000));
                    socket.emit("subasta:estado-actual", {
                        subastaId,
                        estado: "programada",
                        precioActual: Number(subasta.precio_actual),
                        segundosParaInicio,
                        ganador: null
                    });
                } else if (subasta.estado === "activa") {
                    const estadoTemp = await asegurarEstadoTemporizador(subasta, io);

                    if (estadoTemp.finalizada) {
                        socket.emit("subasta:estado-actual", {
                            subastaId,
                            estado: "finalizada",
                            precioActual: Number(subasta.precio_actual),
                            segundosRestantes: 0,
                            ganador: subasta.ganador ? { id: subasta.ganador.id, nombre: subasta.ganador.nombre } : null
                        });
                    } else {
                        socket.emit("subasta:estado-actual", {
                            subastaId,
                            estado: "activa",
                            precioActual: Number(subasta.precio_actual),
                            segundosRestantes: estadoTemp.segundosRestantes,
                            ganador: subasta.ganador ? { id: subasta.ganador.id, nombre: subasta.ganador.nombre } : null
                        });
                    }
                }

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

                // Enviar historial de chat al cliente
                const mensajesChat = await MensajeChat.findAll({
                    where: { subasta_id: subastaId },
                    include: [{ model: Usuario, as: "usuario", attributes: ["id", "nombre"] }],
                    order: [["created_at", "ASC"]],
                    limit: 50
                });

                socket.emit("subasta:historial-chat", {
                    mensajes: mensajesChat.map((m) => ({
                        id: m.id,
                        mensaje: m.mensaje,
                        usuario: m.usuario ? m.usuario.nombre : "Anónimo",
                        usuarioId: m.usuario_id,
                        fecha: m.created_at
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

                const estadoEfectivo = obtenerEstadoEfectivo(subasta);

                if (subasta.estado !== "activa" || estadoEfectivo === "programada") {
                    return socket.emit("subasta:error", { mensaje: "Esta subasta aún no ha comenzado." });
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

                // 8. Reiniciar el temporizador de inactividad (a partir de esta puja)
                reiniciarTemporizador(subastaId, io, subasta.tiempo_inactividad_minutos);

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

                // 11. Procesar auto-pujas de competidores
                setTimeout(() => procesarAutoPujas(subastaId, io), 300);

            } catch (error) {
                console.error("[Socket.io] Error al pujar:", error.message);
                socket.emit("subasta:error", { mensaje: "Error al procesar tu puja." });
            }
        });

        //------------------------------------
        // CONFIGURAR / CANCELAR AUTO-PUJA
        //------------------------------------

        socket.on("subasta:auto-puja", async ({ subastaId, montoMaximo, token }) => {
            const contenidoToken = autenticarSocket(token);
            if (!contenidoToken) {
                return socket.emit("subasta:error", { mensaje: "Debes iniciar sesión para activar auto-puja." });
            }

            const maxNum = Number(montoMaximo);
            if (!maxNum || maxNum <= 0) {
                return socket.emit("subasta:error", { mensaje: "El monto máximo de auto-puja no es válido." });
            }

            try {
                const subasta = await Subasta.findByPk(subastaId);
                if (!subasta || subasta.estado !== "activa") {
                    return socket.emit("subasta:error", { mensaje: "La subasta no está activa." });
                }

                if (subasta.usuario_id === contenidoToken.id) {
                    return socket.emit("subasta:error", { mensaje: "No puedes auto-pujar en tu propia subasta." });
                }

                const precioActual = Number(subasta.precio_actual);
                const pujaMinima = Math.round(precioActual * 1.05 * 100) / 100;

                if (maxNum < pujaMinima) {
                    return socket.emit("subasta:error", {
                        mensaje: `El monto máximo ($${maxNum.toFixed(2)}) debe ser al menos de $${pujaMinima.toFixed(2)}.`
                    });
                }

                // Crear o actualizar AutoPuja
                const [autoPujaRecord] = await AutoPuja.upsert({
                    usuario_id: contenidoToken.id,
                    subasta_id: subastaId,
                    monto_maximo: maxNum,
                    activo: true
                });

                socket.emit("subasta:auto-puja-confirmado", {
                    subastaId,
                    montoMaximo: maxNum,
                    mensaje: `Auto-puja activa hasta $${maxNum.toFixed(2)}`
                });

                // Procesar auto-pujas de inmediato por si el nuevo máximo altera el liderazgo
                await procesarAutoPujas(subastaId, io);

            } catch (error) {
                console.error("[Socket.io] Error al configurar auto-puja:", error.message);
                socket.emit("subasta:error", { mensaje: "Error al activar la auto-puja." });
            }
        });

        socket.on("subasta:cancelar-auto-puja", async ({ subastaId, token }) => {
            const contenidoToken = autenticarSocket(token);
            if (!contenidoToken) return;

            try {
                await AutoPuja.update(
                    { activo: false },
                    { where: { usuario_id: contenidoToken.id, subasta_id: subastaId } }
                );
                socket.emit("subasta:auto-puja-cancelado", { mensaje: "Auto-puja desactivada." });
            } catch (error) {
                console.error("[Socket.io] Error al cancelar auto-puja:", error.message);
            }
        });

        //------------------------------------
        // CHAT EN TIEMPO REAL
        //------------------------------------

        socket.on("subasta:enviar-mensaje", async ({ subastaId, mensaje, token }) => {
            const contenidoToken = autenticarSocket(token);
            if (!contenidoToken) {
                return socket.emit("subasta:error", { mensaje: "Debes iniciar sesión para chatear." });
            }

            const textoLimpio = String(mensaje || "").trim();
            if (!textoLimpio || textoLimpio.length > 500) {
                return socket.emit("subasta:error", { mensaje: "El mensaje no puede estar vacío ni superar los 500 caracteres." });
            }

            try {
                const subasta = await Subasta.findByPk(subastaId);
                if (!subasta) {
                    return socket.emit("subasta:error", { mensaje: "Subasta no encontrada." });
                }

                const nuevoMensaje = await MensajeChat.create({
                    subasta_id: subastaId,
                    usuario_id: contenidoToken.id,
                    mensaje: textoLimpio
                });

                const usuario = await Usuario.findByPk(contenidoToken.id, {
                    attributes: ["id", "nombre"]
                });

                const datosMensaje = {
                    id: nuevoMensaje.id,
                    mensaje: textoLimpio,
                    usuario: usuario ? usuario.nombre : "Anónimo",
                    usuarioId: contenidoToken.id,
                    fecha: nuevoMensaje.created_at
                };

                io.to(`subasta:${subastaId}`).emit("subasta:nuevo-mensaje", datosMensaje);

            } catch (error) {
                console.error("[Socket.io] Error al enviar mensaje:", error.message);
                socket.emit("subasta:error", { mensaje: "Error al enviar el mensaje." });
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
