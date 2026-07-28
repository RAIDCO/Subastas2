// Modelo de Sequelize para los Usuarios (compradores, vendedores, administradores)
const { DataTypes } = require("sequelize");
const { sequelize } = require("../configuracion/baseDeDatos");

const Usuario = sequelize.define(
    "Usuario",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        nombre: {
            type: DataTypes.STRING(120),
            allowNull: false,
            validate: {
                len: [3, 120]
            }
        },

        correo: {
            type: DataTypes.STRING(180),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },

        clave: {
            type: DataTypes.STRING(255),
            allowNull: false
        },

        rol: {
            type: DataTypes.ENUM(
                "usuario",
                "administrador"
            ),
            allowNull: false,
            defaultValue: "usuario"
        },

        activo: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }

    },
    {
        tableName: "usuarios",

        timestamps: true,

        createdAt: "created_at",

        updatedAt: "updated_at"
    }
);

module.exports = Usuario;