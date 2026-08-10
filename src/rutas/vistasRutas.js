const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Subasta, Usuario, Categoria } = require('../modelos');

const { requiereSesionVista, cargarUsuarioSiExiste } = require('../intermediarios/autenticacionIntermediario');
const { obtenerHistorialUsuario } = require('../controladores/usuarioControlador');
const { mostrarDetalleSubasta, mostrarFormularioCrear } = require('../controladores/subastaControlador');
const { cerrarSesion } = require('../controladores/autenticacionControlador');

// Función helper para calcular estado en tiempo real (programada / activa / finalizada)
const obtenerEstadoEfectivo = (subasta) => {
  if (subasta.estado === 'rechazada') return 'rechazada';
  if (subasta.estado === 'finalizada') return 'finalizada';

  const ahora = new Date();
  if (subasta.fecha_inicio && new Date(subasta.fecha_inicio) > ahora) {
    return 'programada';
  }

  return 'activa';
};

// Ruta principal / Landing Page
router.get('/', async (req, res) => {
  try {
    const subastas = await Subasta.findAll({
      where: { estado: 'activa' },
      include: [
        { model: Usuario, as: 'vendedor', attributes: ['id', 'nombre'] },
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const mezcladas = subastas
      .map((s) => ({ subasta: s, orden: Math.random() }))
      .sort((a, b) => a.orden - b.orden)
      .slice(0, 6)
      .map(({ subasta: s }) => ({
        id: s.id,
        titulo: s.titulo,
        descripcion: s.descripcion,
        imagen_url: s.imagen_url,
        precio_actual: Number(s.precio_actual),
        precio_inicial: Number(s.precio_inicial),
        estado: s.estado,
        estadoEfectivo: obtenerEstadoEfectivo(s),
        categoria: s.categoria ? s.categoria.nombre : 'General',
        vendedor: s.vendedor ? s.vendedor.nombre : 'Vendedor',
        fecha_inicio: s.fecha_inicio,
        fecha_fin: s.fecha_fin
      }));

    res.render('paginas/inicio', {
      titulo: 'Inicio - SubastasPro',
      subastasDestacadas: mezcladas
    });
  } catch (error) {
    console.error('Error al cargar landing page:', error.message);
    res.render('paginas/inicio', {
      titulo: 'Inicio - SubastasPro',
      subastasDestacadas: []
    });
  }
});

// Catálogo de subastas activas (con búsqueda, filtros por categoría/estado y ordenación)
router.get('/subastas', cargarUsuarioSiExiste, async (req, res) => {
  try {
    const { buscar, categoria, estado, orden } = req.query;

    const condicionWhere = {};

    // 1. Filtro por Estado
    if (estado && estado !== 'todas') {
      condicionWhere.estado = estado;
    } else if (!estado) {
      condicionWhere.estado = 'activa';
    }

    // 2. Búsqueda por texto en título o descripción
    if (buscar && buscar.trim() !== '') {
      const termino = `%${buscar.trim()}%`;
      condicionWhere[Op.or] = [
        { titulo: { [Op.iLike]: termino } },
        { descripcion: { [Op.iLike]: termino } }
      ];
    }

    // 3. Ordenación
    let ordenConsulta = [['created_at', 'DESC']];
    if (orden === 'menor-precio') {
      ordenConsulta = [['precio_actual', 'ASC']];
    } else if (orden === 'mayor-precio') {
      ordenConsulta = [['precio_actual', 'DESC']];
    } else if (orden === 'tiempo') {
      ordenConsulta = [['fecha_fin', 'ASC']];
    }

    // 4. Filtro por Categoría
    const includeCategoria = {
      model: Categoria,
      as: 'categoria',
      attributes: ['id', 'nombre']
    };

    if (categoria && categoria !== 'Todas') {
      includeCategoria.where = { nombre: categoria };
    }

    const subastas = await Subasta.findAll({
      where: condicionWhere,
      include: [
        { model: Usuario, as: 'vendedor', attributes: ['id', 'nombre'] },
        includeCategoria
      ],
      order: ordenConsulta
    });

    const subastasFormateadas = subastas.map((s) => ({
      id: s.id,
      titulo: s.titulo,
      descripcion: s.descripcion,
      imagen_url: s.imagen_url,
      precio_inicial: Number(s.precio_inicial),
      precio_actual: Number(s.precio_actual),
      estado: s.estado,
      estadoEfectivo: obtenerEstadoEfectivo(s),
      creador: s.vendedor,
      categoria: s.categoria,
      fecha_inicio: s.fecha_inicio,
      fecha_fin: s.fecha_fin,
      tiempo_inactividad_minutos: s.tiempo_inactividad_minutos
    }));

    res.render('paginas/subastas', {
      titulo: 'Subastas Activas - SubastasPro',
      paginaActual: 'subastas',
      subastas: subastasFormateadas,
      usuario: req.usuario || null,
      buscar: buscar || '',
      categoriaSel: categoria || 'Todas',
      estadoSel: estado || 'activa',
      ordenSel: orden || 'recientes',
      busquedaActual: buscar || ''
    });
  } catch (error) {
    console.error('Error al cargar catálogo de subastas:', error.message);
    res.render('paginas/subastas', {
      titulo: 'Subastas Activas - SubastasPro',
      paginaActual: 'subastas',
      subastas: [],
      usuario: req.usuario || null,
      buscar: req.query.buscar || '',
      categoriaSel: req.query.categoria || 'Todas',
      estadoSel: req.query.estado || 'activa',
      ordenSel: req.query.orden || 'recientes',
      busquedaActual: req.query.buscar || ''
    });
  }
});

// Detalle de una subasta individual (carga datos del usuario si hay sesión)
router.get('/subastas/:id', cargarUsuarioSiExiste, mostrarDetalleSubasta);

// Crear subasta (protegida: requiere sesión)
router.get('/crear-subasta', requiereSesionVista, mostrarFormularioCrear);

// Historial de subastas (ruta protegida: sin sesión redirige al login)
router.get('/historial', requiereSesionVista, obtenerHistorialUsuario);

// Panel de administración (moderación de subastas pendientes)
router.get('/admin', async (req, res) => {
  try {
    const subastas = await Subasta.findAll({
      where: { estado: 'pendiente' },
      include: [
        { model: Usuario, attributes: ['id', 'nombre', 'correo'] },
        { model: Categoria, attributes: ['id', 'nombre'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.render('paginas/panel-admin', {
      titulo: 'Panel Admin - SubastasPro',
      paginaActual: 'admin',
      subastas,
      usuario: null
    });
  } catch (error) {
    res.render('paginas/panel-admin', {
      titulo: 'Panel Admin - SubastasPro',
      paginaActual: 'admin',
      subastas: [],
      usuario: null
    });
  }
});

// Vista de iniciar sesión (soporta /iniciar-sesion y /login)
router.get(['/iniciar-sesion', '/login'], (req, res) => {
  res.render('paginas/iniciar-sesion', {
    titulo: 'Iniciar Sesión - SubastasPro'
  });
});

// Vista de registro
router.get('/registro', (req, res) => {
  res.render('paginas/registro', {
    titulo: 'Registro de Usuario - SubastasPro'
  });
});

// Ruta pública de cerrar sesión (/cerrar-sesion o /logout)
router.get(['/cerrar-sesion', '/logout'], cerrarSesion);

module.exports = router;