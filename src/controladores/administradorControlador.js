const { Subasta, Usuario, Categoria, Auditoria } = require("../modelos");

/**
 * Obtener las subastas pendientes de aprobación.
 */
const obtenerSubastasPendientes = async (req, res) => {
    try {
        const subastas = await Subasta.findAll({
            where: {
                estado: "pendiente"
            },
            include: [
                {
                    model: Usuario,
                    attributes: ["id", "nombre", "correo"]
                },
                {
                    model: Categoria,
                    attributes: ["id", "nombre"]
                }
            ],
            order: [["created_at", "DESC"]]
        });

        return res.status(200).json(subastas);
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            mensaje: "Error al obtener las subastas pendientes."
        });
    }
};

/**
 * Aprobar una subasta.
 */
const aprobarSubasta = async (req, res) => {
    try {
        const { id } = req.params;

        const subasta = await Subasta.findByPk(id);

        if (!subasta) {
            return res.status(404).json({
                mensaje: "La subasta no existe."
            });
        }

        if (subasta.estado !== "pendiente") {
            return res.status(400).json({
                mensaje: "La subasta ya fue procesada."
            });
        }

        subasta.estado = "activa";
        await subasta.save();

        try {
            await Auditoria.create({
                usuario_id: req.usuario ? req.usuario.id : null,
                accion: "Aprobar subasta",
                tabla: "subastas",
                registro_id: subasta.id,
                descripcion: `Se aprobó la subasta "${subasta.titulo}".`,
                ip: req.ip
            });
        } catch (auditoriaErr) {
            console.error("Error al crear auditoría:", auditoriaErr.message);
        }

        // Si la petición viene de un formulario HTML, redirige al panel admin
        if (req.headers["content-type"] && req.headers["content-type"].includes("application/x-www-form-urlencoded")) {
            return res.redirect("/admin");
        }

        return res.status(200).json({
            mensaje: "Subasta aprobada correctamente."
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            mensaje: "Error al aprobar la subasta."
        });
    }
};

/**
 * Rechazar una subasta.
 */
const rechazarSubasta = async (req, res) => {
    try {
        const { id } = req.params;

        const subasta = await Subasta.findByPk(id);

        if (!subasta) {
            return res.status(404).json({
                mensaje: "La subasta no existe."
            });
        }

        if (subasta.estado !== "pendiente") {
            return res.status(400).json({
                mensaje: "La subasta ya fue procesada."
            });
        }

        subasta.estado = "rechazada";
        await subasta.save();

        try {
            await Auditoria.create({
                usuario_id: req.usuario ? req.usuario.id : null,
                accion: "Rechazar subasta",
                tabla: "subastas",
                registro_id: subasta.id,
                descripcion: `Se rechazó la subasta "${subasta.titulo}".`,
                ip: req.ip
            });
        } catch (auditoriaErr) {
            console.error("Error al crear auditoría:", auditoriaErr.message);
        }

        // Si la petición viene de un formulario HTML, redirige al panel admin
        if (req.headers["content-type"] && req.headers["content-type"].includes("application/x-www-form-urlencoded")) {
            return res.redirect("/admin");
        }

        return res.status(200).json({
            mensaje: "Subasta rechazada correctamente."
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            mensaje: "Error al rechazar la subasta."
        });
    }
};

module.exports = {
    obtenerSubastasPendientes,
    aprobarSubasta,
    rechazarSubasta
};