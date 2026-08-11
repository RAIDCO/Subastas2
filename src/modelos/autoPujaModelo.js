// Modelo de Sequelize para Auto-Pujas (puja máxima automática)
const { DataTypes } = require("sequelize");
const { sequelize } = require("../configuracion/baseDeDatos");

const AutoPuja = sequelize.define(
    "AutoPuja",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        usuario_id: {
            type: DataTypes.UUID,
            allowNull: false
        },

        subasta_id: {
            type: DataTypes.UUID,
            allowNull: false
        },

        monto_maximo: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0.01
            }
        },

        activo: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    },
    {
        tableName: "auto_pujas",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
            {
                unique: true,
                fields: ["usuario_id", "subasta_id"]
            }
        ]
    }
);

module.exports = AutoPuja;
