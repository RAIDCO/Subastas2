// Modelo de Sequelize para las Pujas registradas en cada subasta
const { DataTypes } = require("sequelize");
const { sequelize } = require("../configuracion/baseDeDatos");

const Puja = sequelize.define(
    "Puja",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        monto: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0.01
            }
        },

        subasta_id: {
            type: DataTypes.UUID,
            allowNull: false
        },

        usuario_id: {
            type: DataTypes.UUID,
            allowNull: false
        }

    },
    {
        tableName: "pujas",

        timestamps: true,

        createdAt: "created_at",

        updatedAt: false
    }
);

module.exports = Puja;