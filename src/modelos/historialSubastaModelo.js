const { DataTypes } = require("sequelize");
const { sequelize } = require("../configuracion/baseDeDatos");

const HistorialSubasta = sequelize.define(
    "HistorialSubasta",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        subasta_id: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true
        },

        vendedor_id: {
            type: DataTypes.UUID,
            allowNull: false
        },

        ganador_id: {
            type: DataTypes.UUID,
            allowNull: true
        },

        categoria_id: {
            type: DataTypes.UUID,
            allowNull: false
        },

        titulo: {
            type: DataTypes.STRING(150),
            allowNull: false
        },

        descripcion: {
            type: DataTypes.TEXT
        },

        precio_inicial: {
            type: DataTypes.DECIMAL(10,2)
        },

        precio_final: {
            type: DataTypes.DECIMAL(10,2)
        },

        fecha_inicio: {
            type: DataTypes.DATE
        },

        fecha_fin: {
            type: DataTypes.DATE
        },

        fecha_cierre: {
            type: DataTypes.DATE
        },

        estado: {
            type: DataTypes.ENUM(
                "pendiente",
                "activa",
                "finalizada",
                "rechazada"
            )
        },

        total_pujas: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }

    },
    {
        tableName: "historial_subastas",

        timestamps: true,

        createdAt: "created_at",

        updatedAt: false
    }
);

module.exports = HistorialSubasta;