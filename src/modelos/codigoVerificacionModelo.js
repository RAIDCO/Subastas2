// Modelo de Sequelize para almacenar códigos OTP de verificación de correo
const { DataTypes } = require("sequelize");
const { sequelize } = require("../configuracion/baseDeDatos");

const CodigoVerificacion = sequelize.define(
    "CodigoVerificacion",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        correo: {
            type: DataTypes.STRING(180),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },

        codigo: {
            type: DataTypes.STRING(6),
            allowNull: false
        },

        expira_en: {
            type: DataTypes.DATE,
            allowNull: false
        },

        intentos: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },

        ultimo_envio: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: "codigos_verificacion",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

module.exports = CodigoVerificacion;
