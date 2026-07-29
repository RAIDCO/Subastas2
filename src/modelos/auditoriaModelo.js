const { DataTypes } = require("sequelize");
const { sequelize } = require("../configuracion/baseDeDatos");

const Auditoria = sequelize.define(
    "Auditoria",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        usuario_id: {
            type: DataTypes.UUID,
            allowNull: true
        },

        accion: {
            type: DataTypes.STRING(80),
            allowNull: false
        },

        tabla: {
            type: DataTypes.STRING(80),
            allowNull: false
        },

        registro_id: {
            type: DataTypes.UUID
        },

        descripcion: {
            type: DataTypes.TEXT
        },

        ip: {
            type: DataTypes.STRING(45)
        }

    },
    {
        tableName: "auditoria",

        timestamps: true,

        createdAt: "created_at",

        updatedAt: false
    }
);

module.exports = Auditoria;