// Modelo de Sequelize para las Subastas (estado, precio base, tiempos de inactividad, etc.)
const { DataTypes } = require("sequelize");
const { sequelize } = require("../configuracion/baseDeDatos");

const Subasta = sequelize.define(
    "Subasta",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        titulo: {
            type: DataTypes.STRING(150),
            allowNull: false,
            validate: {
                len: [5, 150]
            }
        },

        descripcion: {
            type: DataTypes.TEXT,
            allowNull: false
        },

        imagen_url: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        precio_inicial: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0.01
            }
        },

        precio_actual: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0.01
            }
        },

        estado: {
            type: DataTypes.ENUM(
                "pendiente",
                "activa",
                "finalizada",
                "rechazada"
            ),
            allowNull: false,
            defaultValue: "pendiente"
        },

        tiempo_inactividad_minutos: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 5
        },

        fecha_inicio: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },

        fecha_fin: {
            type: DataTypes.DATE,
            allowNull: false
        },

        ultima_puja_at: {
            type: DataTypes.DATE,
            allowNull: true
        },

        fecha_cierre: {
            type: DataTypes.DATE,
            allowNull: true
        },

        usuario_id: {
            type: DataTypes.UUID,
            allowNull: false
        },

        categoria_id: {
            type: DataTypes.UUID,
            allowNull: false
        },

        ganador_id: {
            type: DataTypes.UUID,
            allowNull: true
        },

        inicio_delay_minutos: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },

        duracion_horas: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 24
        }

    },
    {
        tableName: "subastas",

        timestamps: true,

        createdAt: "created_at",

        updatedAt: "updated_at"
    }
);

module.exports = Subasta;