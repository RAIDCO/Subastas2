const { Categoria } = require('../modelos');

const CATEGORIAS_BASE = [
  'Tecnología',
  'Coleccionables',
  'Arte',
  'Vehículos',
  'Instrumentos'
];

/**
 * Sembrar las 5 categorías base en la base de datos si la tabla está vacía.
 */
const insertarCategoriasBase = async () => {
  try {
    const conteo = await Categoria.count();

    if (conteo === 0) {
      for (const nombre of CATEGORIAS_BASE) {
        await Categoria.findOrCreate({
          where: { nombre },
          defaults: { nombre }
        });
      }
      console.log('✅ Categorías base sembradas exitosamente.');
    }
  } catch (err) {
    console.error('Error al insertar categorías base:', err.message);
  }
};

/**
 * Obtener la lista de todas las categorías (sembrando las base primero si no existen).
 * GET /api/categorias
 */
const obtenerCategorias = async (req, res) => {
  try {
    await insertarCategoriasBase();

    const categorias = await Categoria.findAll({
      order: [['nombre', 'ASC']]
    });

    return res.status(200).json({
      exito: true,
      datos: categorias
    });
  } catch (err) {
    console.error('Error al obtener categorías:', err.message);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al obtener las categorías.',
      error: err.message
    });
  }
};

module.exports = {
  insertarCategoriasBase,
  obtenerCategorias
};