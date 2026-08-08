// Servicio de temporizador de inactividad para subastas en tiempo real.
// Cada subasta activa tiene un setTimeout que se reinicia con cada puja.
// Si expira (ninguna puja en el período de inactividad), la subasta se cierra.

const { Subasta, Puja } = require("../modelos");
const { eliminarImagen } = require("../configuracion/multerConfig");

//====================================
// ALMACÉN DE TEMPORIZADORES EN MEMORIA
// Clave: subastaId → { timer, finalizaEn, minutos }
//====================================

const temporizadores = new Map();

// Intervalo de ticks (cada segundo envía el tiempo restante)
const intervalos = new Map();

//====================================
// OBTENER TIEMPO RESTANTE
//====================================

const obtenerTiempoRestante = (subastaId) => {
    const datos = temporizadores.get(subastaId);

    if (!datos) {
        return 0;
    }

    const restante = Math.max(0, Math.ceil((datos.finalizaEn - Date.now()) / 1000));
    return restante;
};

//====================================
// DETENER TEMPORIZADOR
//====================================

const detenerTemporizador = (subastaId) => {
    const datos = temporizadores.get(subastaId);

    if (datos) {
        clearTimeout(datos.timer);
        temporizadores.delete(subastaId);
    }

    const intervalo = intervalos.get(subastaId);

    if (intervalo) {
        clearInterval(intervalo);
        intervalos.delete(subastaId);
    }
};

//====================================
// FINALIZAR SUBASTA
// Se ejecuta cuando el temporizador expira sin pujas nuevas.
//====================================

const finalizarSubasta = async (subastaId, io) => {
    detenerTemporizador(subastaId);

    try {
        const subasta = await Subasta.findByPk(subastaId);

        if (!subasta || subasta.estado !== "activa") {
            return;
        }

        // Buscar la puja más alta para declarar al ganador
        const pujaGanadora = await Puja.findOne({
            where: { subasta_id: subastaId },
            order: [["monto", "DESC"]]
        });

        subasta.estado = "finalizada";
        subasta.fecha_cierre = new Date();

        if (pujaGanadora) {
            subasta.ganador_id = pujaGanadora.usuario_id;
        }

        await subasta.save();

        // Notificar a todos los clientes en la sala
        io.to(`subasta:${subastaId}`).emit("subasta:finalizada", {
            subastaId,
            ganadorId: pujaGanadora ? pujaGanadora.usuario_id : null,
            precioFinal: Number(subasta.precio_actual),
            mensaje: pujaGanadora
                ? "¡La subasta ha finalizado! Se ha declarado un ganador."
                : "La subasta ha finalizado sin pujas."
        });

        // Eliminar la imagen del disco (las imágenes son temporales)
        if (subasta.imagen_url) {
            eliminarImagen(subasta.imagen_url);
        }

        console.log(`[Temporizador] Subasta ${subastaId} finalizada.`);
    } catch (error) {
        console.error(`[Temporizador] Error al finalizar subasta ${subastaId}:`, error.message);
    }
};

//====================================
// INICIAR TEMPORIZADOR
// Arranca el cronómetro de inactividad y el intervalo de ticks.
//====================================

const iniciarTemporizador = (subastaId, minutos, io) => {
    // Limpiar cualquier temporizador anterior
    detenerTemporizador(subastaId);

    const milisegundos = minutos * 60 * 1000;
    const finalizaEn = Date.now() + milisegundos;

    const timer = setTimeout(() => {
        finalizarSubasta(subastaId, io);
    }, milisegundos);

    temporizadores.set(subastaId, { timer, finalizaEn, minutos });

    // Tick cada segundo para enviar el tiempo restante
    const intervalo = setInterval(() => {
        const segundos = obtenerTiempoRestante(subastaId);

        io.to(`subasta:${subastaId}`).emit("subasta:tiempo-actualizado", {
            subastaId,
            segundosRestantes: segundos
        });

        if (segundos <= 0) {
            clearInterval(intervalo);
            intervalos.delete(subastaId);
        }
    }, 1000);

    intervalos.set(subastaId, intervalo);

    console.log(`[Temporizador] Subasta ${subastaId}: ${minutos} min de inactividad iniciados.`);
};

//====================================
// REINICIAR TEMPORIZADOR
// Se llama cada vez que se recibe una nueva puja válida.
//====================================

const reiniciarTemporizador = (subastaId, io) => {
    const datos = temporizadores.get(subastaId);

    if (!datos) {
        return;
    }

    iniciarTemporizador(subastaId, datos.minutos, io);
};

module.exports = {
    iniciarTemporizador,
    reiniciarTemporizador,
    detenerTemporizador,
    obtenerTiempoRestante
};
