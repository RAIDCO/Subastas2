// Modelo de Sequelize para los Favoritos (watchlist de subastas del usuario)
const { DataTypes } = require("sequelize");
const { sequelize } = require("../configuracion/baseDeDatos");

const Favorito = sequelize.define(
    "Favorito",
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
        }
    },
    {
        tableName: "favoritos",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
        indexes: [
            {
                unique: true,
                fields: ["usuario_id", "subasta_id"]
            }
        ]
    }
);

module.exports = Favorito;
