const { sequelize } = require("../configuracion/baseDeDatos");

const Usuario = require("./usuarioModelo");
const Categoria = require("./categoriaModelo");
const Subasta = require("./subastaModelo");
const Puja = require("./pujaModelo");
const HistorialSubasta = require("./historialSubastaModelo");
const Auditoria = require("./auditoriaModelo");

//====================================
// RELACIÓN USUARIO - SUBASTA
// Un usuario puede crear muchas subastas
//====================================

Usuario.hasMany(Subasta, {
    foreignKey: "usuario_id",
    as: "subastas"
});

Subasta.belongsTo(Usuario, {
    foreignKey: "usuario_id",
    as: "vendedor"
});

//====================================
// RELACIÓN CATEGORÍA - SUBASTA
// Una categoría puede tener muchas subastas
//====================================

Categoria.hasMany(Subasta, {
    foreignKey: "categoria_id",
    as: "subastas"
});

Subasta.belongsTo(Categoria, {
    foreignKey: "categoria_id",
    as: "categoria"
});

//====================================
// RELACIÓN GANADOR - SUBASTA
// Un usuario puede ganar muchas subastas
//====================================

Usuario.hasMany(Subasta, {
    foreignKey: "ganador_id",
    as: "subastasGanadas"
});

Subasta.belongsTo(Usuario, {
    foreignKey: "ganador_id",
    as: "ganador"
});

//====================================
// RELACIÓN SUBASTA - PUJA
// Una subasta tiene muchas pujas
//====================================

Subasta.hasMany(Puja, {
    foreignKey: "subasta_id",
    as: "pujas"
});

Puja.belongsTo(Subasta, {
    foreignKey: "subasta_id",
    as: "subasta"
});

//====================================
// RELACIÓN USUARIO - PUJA
// Un usuario puede realizar muchas pujas
//====================================

Usuario.hasMany(Puja, {
    foreignKey: "usuario_id",
    as: "pujas"
});

Puja.belongsTo(Usuario, {
    foreignKey: "usuario_id",
    as: "usuario"
});

//====================================
// EXPORTAR MODELOS
//====================================

module.exports = {
    sequelize,
    Usuario,
    Categoria,
    Subasta,
    Puja,
    HistorialSubasta,
    Auditoria
};