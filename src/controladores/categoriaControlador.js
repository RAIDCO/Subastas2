const { sequelize } = require('../configuracion/baseDeDatos.js');
const { QueryTypes } = require('sequelize');

const CATEGORIAS_BASE = [
  'Tecnología',
  'Coleccionables',
  'Arte',
  'Vehículos',
  'Instrumentos'
];

const insertarCategoriasBase = async () => {
  try {
    const categoriasExistentes = await sequelize.query(
      'SELECT id FROM categorias LIMIT 1',
      { type: QueryTypes.SELECT }
    );

    if (!categoriasExistentes || categoriasExistentes.length === 0) {
      for (const nombre of CATEGORIAS_BASE) {
        await sequelize.query(
          'INSERT INTO categorias (nombre) VALUES (:nombre)',
          {
            replacements: { nombre },
            type: QueryTypes.INSERT
          }
        );
      }
      console.log('Categorías base insertadas exitosamente.');
    }
  } catch (err) {
    console.error('Error al insertar categorías:', err.message);
  }
};

const obtenerCategorias = async (req, res) => {
  try {
    await insertarCategoriasBase();

    const categorias = await sequelize.query(
      'SELECT * FROM categorias ORDER BY nombre ASC',
      { type: QueryTypes.SELECT }
    );

    return res.status(200).json({
      exito: true,
      datos: categorias
    });

  } catch (err) {
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor',
      error: err.message
    });
  }
};

module.exports = {
  insertarCategoriasBase,
  obtenerCategorias
};