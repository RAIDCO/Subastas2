// Servicio de temporizador de inactividad para subastas en tiempo real.
// El temporizador inicia ÚNICAMENTE tras la primera puja.
// Persistente ante reinicios del servidor / suspensiones de Render mediante timestamps en BD.

const { Subasta, Puja } = require("../modelos");

//====================================
// ALMACÉN DE TEMPORIZADORES EN MEMORIA
// Clave: subastaId → { timer, finalizaEn, minutos }
//====================================

const temporizadores = new Map();
const intervalos = new Map();

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

        if (io) {
            io.to(`subasta:${subastaId}`).emit("subasta:finalizada", {
                subastaId,
                ganadorId: pujaGanadora ? pujaGanadora.usuario_id : null,
                precioFinal: Number(subasta.precio_actual),
                mensaje: pujaGanadora
                    ? "¡La subasta ha finalizado! Se ha declarado un ganador."
                    : "La subasta ha finalizado sin pujas."
            });
        }

        console.log(`[Temporizador] Subasta ${subastaId} finalizada correctamente.`);
    } catch (error) {
        console.error(`[Temporizador] Error al finalizar subasta ${subastaId}:`, error.message);
    }
};

//====================================
// OBTENER TIEMPO RESTANTE
//====================================

const obtenerTiempoRestante = (subastaId) => {
    const datos = temporizadores.get(subastaId);
    if (!datos) {
        return null;
    }
    return Math.max(0, Math.ceil((datos.finalizaEn - Date.now()) / 1000));
};

//====================================
// INICIAR TEMPORIZADOR DE INACTIVIDAD
// Solo se llama tras recibir una puja (manual o automática)
//====================================

const iniciarTemporizador = (subastaId, minutos, io, milisegundosPersonalizados = null) => {
    detenerTemporizador(subastaId);

    const milisegundos = milisegundosPersonalizados !== null
        ? milisegundosPersonalizados
        : minutos * 60 * 1000;

    const finalizaEn = Date.now() + milisegundos;

    const timer = setTimeout(() => {
        finalizarSubasta(subastaId, io);
    }, milisegundos);

    temporizadores.set(subastaId, { timer, finalizaEn, minutos });

    // Enviar ticks cada segundo a la sala de socket
    if (io) {
        const intervalo = setInterval(() => {
            const segundos = obtenerTiempoRestante(subastaId);

            if (segundos !== null) {
                io.to(`subasta:${subastaId}`).emit("subasta:tiempo-actualizado", {
                    subastaId,
                    segundosRestantes: segundos
                });

                if (segundos <= 0) {
                    clearInterval(intervalo);
                    intervalos.delete(subastaId);
                }
            }
        }, 1000);

        intervalos.set(subastaId, intervalo);
    }

    console.log(`[Temporizador] Subasta ${subastaId}: inactividad de ${minutos} min activa (expira en ${Math.ceil(milisegundos / 1000)}s).`);
};

//====================================
// REINICIAR TEMPORIZADOR DE INACTIVIDAD
// Se ejecuta cada vez que se realiza una puja
//====================================

const reiniciarTemporizador = (subastaId, io, minutosInactividad = 5) => {
    iniciarTemporizador(subastaId, minutosInactividad, io);
};

//====================================
// ASEGURAR ESTADO DE TEMPORIZADOR (RESILIENTE A SUSPENSIONES DE RENDER)
// Revisa timestamps reales en BD para decidir si la subasta ya expiró,
// si debe reanudar su temporizador de inactividad, o si espera 1ª puja.
//====================================

const asegurarEstadoTemporizador = async (subasta, io) => {
    if (!subasta || subasta.estado !== "activa") {
        return { activa: false, finalizada: true };
    }

    const ahora = Date.now();
    const fechaFin = subasta.fecha_fin ? new Date(subasta.fecha_fin).getTime() : null;

    // 1. Si la fecha límite general de la subasta ya pasó:
    if (fechaFin && fechaFin <= ahora) {
        await finalizarSubasta(subasta.id, io);
        return { activa: false, finalizada: true };
    }

    // 2. Si AÚN NO SE HA REALIZADO NINGUNA PUJA:
    // El cronómetro de inactividad NO inicia hasta la 1ª puja.
    if (!subasta.ultima_puja_at) {
        return { activa: true, enInactividad: false, segundosRestantes: null };
    }

    // 3. SI YA HUBO AL MENOS UNA PUJA:
    const ultimaPujaMs = new Date(subasta.ultima_puja_at).getTime();
    const duracionMaxMs = subasta.tiempo_inactividad_minutos * 60 * 1000;
    const transcurridoMs = ahora - ultimaPujaMs;
    const restanteMs = duracionMaxMs - transcurridoMs;

    // Si el período de inactividad transcurrió mientras el servidor estaba inactivo / durmiendo:
    if (restanteMs <= 0) {
        await finalizarSubasta(subasta.id, io);
        return { activa: false, finalizada: true };
    }

    // Si el tiempo aún es válido y el timer no está corriendo en memoria, reanudarlo
    if (!temporizadores.has(subasta.id)) {
        iniciarTemporizador(subasta.id, subasta.tiempo_inactividad_minutos, io, restanteMs);
    }

    const segs = obtenerTiempoRestante(subasta.id) || Math.ceil(restanteMs / 1000);
    return { activa: true, enInactividad: true, segundosRestantes: segs };
};

module.exports = {
    iniciarTemporizador,
    reiniciarTemporizador,
    detenerTemporizador,
    obtenerTiempoRestante,
    finalizarSubasta,
    asegurarEstadoTemporizador
};
