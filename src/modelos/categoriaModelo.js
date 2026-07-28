// Modelo de Sequelize para las Categorías de los artículos en subasta
const { DataTypes } = require("sequelize");
const { sequelize } = require("../configuracion/baseDeDatos");

const Categoria = sequelize.define(
    "Categoria",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        nombre: {
            type: DataTypes.STRING(80),
            allowNull: false,
            unique: true,
            validate: {
                len: [3, 80]
            }
        },

        descripcion: {
            type: DataTypes.TEXT,
            allowNull: true
        }

    },
    {
        tableName: "categorias",

        timestamps: true,

        createdAt: "created_at",

        updatedAt: "updated_at"
    }
);

module.exports = Categoria;