// Modelo de Sequelize para mensajes de chat en tiempo real por subasta
const { DataTypes } = require("sequelize");
const { sequelize } = require("../configuracion/baseDeDatos");

const MensajeChat = sequelize.define(
    "MensajeChat",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        subasta_id: {
            type: DataTypes.UUID,
            allowNull: false
        },

        usuario_id: {
            type: DataTypes.UUID,
            allowNull: false
        },

        mensaje: {
            type: DataTypes.STRING(500),
            allowNull: false,
            validate: {
                len: [1, 500]
            }
        }
    },
    {
        tableName: "mensajes_chat",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false
    }
);

module.exports = MensajeChat;
