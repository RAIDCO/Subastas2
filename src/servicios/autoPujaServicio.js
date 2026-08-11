const { AutoPuja, Puja, Subasta, Usuario } = require("../modelos");
const { reiniciarTemporizador, obtenerTiempoRestante } = require("./temporizadorSubastaServicio");

/**
 * Procesa pujas automáticas (auto-bid / max bid) tras realizar una puja manual o al activar un auto-bid.
 * Si varios usuarios tienen auto-puja, compiten automáticamente hasta alcanzar sus máximos.
 */
const procesarAutoPujas = async (subastaId, io) => {
    try {
        const subasta = await Subasta.findByPk(subastaId);
        if (!subasta || subasta.estado !== "activa") return;

        // Obtener el último pujador actual
        const ultimaPuja = await Puja.findOne({
            where: { subasta_id: subastaId },
            order: [["created_at", "DESC"]]
        });

        const ultimoPujadorId = ultimaPuja ? ultimaPuja.usuario_id : null;
        let precioActual = Number(subasta.precio_actual);
        let pujaMinima = Math.round(precioActual * 1.05 * 100) / 100;

        // Buscar auto-pujas activas para esta subasta con máximo superior o igual a la puja mínima
        const autoPujas = await AutoPuja.findAll({
            where: {
                subasta_id: subastaId,
                activo: true
            },
            order: [["monto_maximo", "DESC"], ["updated_at", "ASC"]]
        });

        if (autoPujas.length === 0) return;

        // El candidato superior
        const mejorAutoPuja = autoPujas[0];
        const montoMaximoMejor = Number(mejorAutoPuja.monto_maximo);

        // Si el mejor auto-pujador ya es el líder actual, revisar si necesita responder a una puja competidora
        if (mejorAutoPuja.usuario_id === ultimoPujadorId) {
            // Verificar si hay un segundo competidor activo
            if (autoPujas.length > 1) {
                const segundoAutoPuja = autoPujas[1];
                const montoMaximoSegundo = Number(segundoAutoPuja.monto_maximo);

                // Si el segundo no ha sido superado completamente, subir la puja del líder lo mínimo necesario
                const montoRequerido = Math.min(montoMaximoMejor, Math.round(montoMaximoSegundo * 1.05 * 100) / 100);
                if (montoRequerido > precioActual) {
                    await realizarPujaAutomatica(subasta, mejorAutoPuja, montoRequerido, io);
                }
            }
            return;
        }

        // Si el mejor auto-pujador NO es el líder actual y su máximo cubre la puja mínima:
        if (montoMaximoMejor >= pujaMinima) {
            let montoAPujar = pujaMinima;

            // Si hay un segundo auto-pujador, calcular puja competitiva
            if (autoPujas.length > 1) {
                const segundoAutoPuja = autoPujas[1];
                const montoSegundo = Number(segundoAutoPuja.monto_maximo);
                if (segundoAutoPuja.usuario_id === ultimoPujadorId) {
                    // El ultimo pujador era el segundo auto-pujador, superar con mínimo 5%
                    montoAPujar = Math.min(montoMaximoMejor, Math.round(precioActual * 1.05 * 100) / 100);
                } else {
                    // Competencia entre dos auto-pujadores nuevos
                    montoAPujar = Math.min(montoMaximoMejor, Math.round(montoSegundo * 1.05 * 100) / 100);
                }
            }

            montoAPujar = Math.max(montoAPujar, pujaMinima);
            await realizarPujaAutomatica(subasta, mejorAutoPuja, montoAPujar, io);

            // Desactivar auto-pujas que hayan sido superadas completamente
            if (montoAPujar >= montoMaximoMejor) {
                mejorAutoPuja.activo = false;
                await mejorAutoPuja.save();
            }
        }
    } catch (error) {
        console.error("[AutoPujaServicio] Error al procesar auto-pujas:", error.message);
    }
};

/**
 * Crea el registro de puja automática en la BD y emite por Socket.io
 */
const realizarPujaAutomatica = async (subasta, autoPujaRecord, monto, io) => {
    const nuevaPuja = await Puja.create({
        monto,
        subasta_id: subasta.id,
        usuario_id: autoPujaRecord.usuario_id
    });

    subasta.precio_actual = monto;
    subasta.ultima_puja_at = new Date();
    await subasta.save();

    reiniciarTemporizador(subasta.id, io);

    const usuario = await Usuario.findByPk(autoPujaRecord.usuario_id, {
        attributes: ["id", "nombre"]
    });

    const datosPuja = {
        id: nuevaPuja.id,
        monto,
        usuario: usuario ? `${usuario.nombre} (Auto-Puja)` : "Auto-Puja",
        usuarioId: autoPujaRecord.usuario_id,
        fecha: nuevaPuja.created_at,
        precioActual: monto,
        segundosRestantes: obtenerTiempoRestante(subasta.id),
        esAutoPuja: true
    };

    io.to(`subasta:${subasta.id}`).emit("subasta:nueva-puja", datosPuja);
    console.log(`[AutoPuja] Puja automática de $${monto} en subasta ${subasta.id} por ${usuario ? usuario.nombre : autoPujaRecord.usuario_id}`);
};

module.exports = {
    procesarAutoPujas
};
