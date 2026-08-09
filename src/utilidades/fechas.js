// Utilidades para formatear fechas en la zona horaria de México y determinar estado de subastas

const ZONA_HORARIA = process.env.ZONA_HORARIA || 'America/Mexico_City';

/**
 * Formatea una fecha o timestamp a formato legible en español (México).
 * Ej: "08 ago 2026, 03:36 p.m."
 */
const formatearFechaMexico = (fecha) => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '—';

    return d.toLocaleString('es-MX', {
        timeZone: ZONA_HORARIA,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

/**
 * Determina el estado efectivo de una subasta considerando las fechas.
 * Retorna: 'pendiente' | 'programada' | 'activa' | 'finalizada' | 'rechazada'
 */
const obtenerEstadoEfectivo = (subasta) => {
    if (!subasta) return 'pendiente';

    if (subasta.estado === 'pendiente' || subasta.estado === 'rechazada' || subasta.estado === 'finalizada') {
        return subasta.estado;
    }

    if (subasta.estado === 'activa') {
        const ahora = new Date();
        const inicio = new Date(subasta.fecha_inicio);
        const fin = new Date(subasta.fecha_fin);

        if (ahora < inicio) {
            return 'programada';
        }
        if (ahora >= fin) {
            return 'finalizada';
        }
        return 'activa';
    }

    return subasta.estado;
};

module.exports = {
    ZONA_HORARIA,
    formatearFechaMexico,
    obtenerEstadoEfectivo
};
