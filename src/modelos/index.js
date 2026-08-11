const { sequelize } = require("../configuracion/baseDeDatos");

const Usuario = require("./usuarioModelo");
const Categoria = require("./categoriaModelo");
const Subasta = require("./subastaModelo");
const Puja = require("./pujaModelo");
const HistorialSubasta = require("./historialSubastaModelo");
const Auditoria = require("./auditoriaModelo");
const CodigoVerificacion = require("./codigoVerificacionModelo");
const Favorito = require("./favoritoModelo");
const AutoPuja = require("./autoPujaModelo");
const MensajeChat = require("./mensajeChatModelo");

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
// RELACIÓN USUARIO - FAVORITO
// Un usuario puede tener muchos favoritos
//====================================

Usuario.hasMany(Favorito, {
    foreignKey: "usuario_id",
    as: "favoritos"
});

Favorito.belongsTo(Usuario, {
    foreignKey: "usuario_id",
    as: "usuario"
});

Subasta.hasMany(Favorito, {
    foreignKey: "subasta_id",
    as: "favoritos"
});

Favorito.belongsTo(Subasta, {
    foreignKey: "subasta_id",
    as: "subasta"
});

//====================================
// RELACIÓN USUARIO - AUTO PUJA
//====================================

Usuario.hasMany(AutoPuja, {
    foreignKey: "usuario_id",
    as: "autoPujas"
});

AutoPuja.belongsTo(Usuario, {
    foreignKey: "usuario_id",
    as: "usuario"
});

Subasta.hasMany(AutoPuja, {
    foreignKey: "subasta_id",
    as: "autoPujas"
});

AutoPuja.belongsTo(Subasta, {
    foreignKey: "subasta_id",
    as: "subasta"
});

//====================================
// RELACIÓN SUBASTA - MENSAJE CHAT
//====================================

Subasta.hasMany(MensajeChat, {
    foreignKey: "subasta_id",
    as: "mensajesChat"
});

MensajeChat.belongsTo(Subasta, {
    foreignKey: "subasta_id",
    as: "subasta"
});

Usuario.hasMany(MensajeChat, {
    foreignKey: "usuario_id",
    as: "mensajesChat"
});

MensajeChat.belongsTo(Usuario, {
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
    Auditoria,
    CodigoVerificacion,
    Favorito,
    AutoPuja,
    MensajeChat
};