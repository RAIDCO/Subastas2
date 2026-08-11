const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Subasta, Usuario, Categoria } = require('../modelos');

const { requiereSesionVista, cargarUsuarioSiExiste, requiereAdminVista } = require('../intermediarios/autenticacionIntermediario');
const { obtenerHistorialUsuario } = require('../controladores/usuarioControlador');
const { mostrarDetalleSubasta, mostrarFormularioCrear } = require('../controladores/subastaControlador');
const { cerrarSesion } = require('../controladores/autenticacionControlador');

const { obtenerEstadoEfectivo } = require('../utilidades/fechas');

// Ruta principal / Landing Page
router.get('/', cargarUsuarioSiExiste, async (req, res) => {
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
      .map((s) => {
        const estEfectivo = obtenerEstadoEfectivo(s);
        return {
          id: s.id,
          titulo: s.titulo,
          descripcion: s.descripcion,
          imagen_url: s.imagen_url,
          precio_actual: Number(s.precio_actual),
          precio_inicial: Number(s.precio_inicial),
          estado: s.estado,
          estadoEfectivo: estEfectivo,
          categoria: s.categoria ? s.categoria.nombre : 'General',
          vendedor: s.vendedor ? s.vendedor.nombre : 'Vendedor',
          fecha_inicio: s.fecha_inicio,
          fecha_fin: s.fecha_fin
        };
      })
      .filter((s) => s.estadoEfectivo === 'activa')
      .slice(0, 6);

    res.render('paginas/inicio', {
      titulo: 'Inicio - SubastasPro',
      subastasDestacadas: mezcladas,
      usuario: req.usuario || null
    });
  } catch (error) {
    console.error('Error al cargar landing page:', error.message);
    res.render('paginas/inicio', {
      titulo: 'Inicio - SubastasPro',
      subastasDestacadas: [],
      usuario: req.usuario || null
    });
  }
});

// Catálogo de subastas (con búsqueda, filtros por categoría/estado y ordenación)
router.get('/subastas', cargarUsuarioSiExiste, async (req, res) => {
  try {
    const { buscar, categoria, estado, orden } = req.query;
    const estadoFiltro = estado || 'activa';

    // Solo se consultan subastas que hayan sido aprobadas (estado 'activa' o 'finalizada' en BD)
    const subastas = await Subasta.findAll({
      where: {
        estado: { [Op.in]: ['activa', 'finalizada'] }
      },
      include: [
        { model: Usuario, as: 'vendedor', attributes: ['id', 'nombre'] },
        {
          model: Categoria,
          as: 'categoria',
          attributes: ['id', 'nombre'],
          ...(categoria && categoria !== 'Todas' ? { where: { nombre: categoria } } : {})
        }
      ],
      order: orden === 'menor-precio'
        ? [['precio_actual', 'ASC']]
        : orden === 'mayor-precio'
        ? [['precio_actual', 'DESC']]
        : orden === 'tiempo'
        ? [['fecha_fin', 'ASC']]
        : [['created_at', 'DESC']]
    });

    const ahora = new Date();
    const limite24Horas = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);

    let subastasFormateadas = subastas.map((s) => {
      const estEfectivo = obtenerEstadoEfectivo(s);
      return {
        id: s.id,
        titulo: s.titulo,
        descripcion: s.descripcion,
        imagen_url: s.imagen_url,
        precio_inicial: Number(s.precio_inicial),
        precio_actual: Number(s.precio_actual),
        estado: s.estado,
        estadoEfectivo: estEfectivo,
        creador: s.vendedor,
        categoria: s.categoria,
        fecha_inicio: s.fecha_inicio,
        fecha_fin: s.fecha_fin,
        fecha_cierre: s.fecha_cierre,
        tiempo_inactividad_minutos: s.tiempo_inactividad_minutos
      };
    });

    // Búsqueda por texto si se especifica
    if (buscar && buscar.trim() !== '') {
      const termino = buscar.trim().toLowerCase();
      subastasFormateadas = subastasFormateadas.filter((s) =>
        s.titulo.toLowerCase().includes(termino) ||
        (s.descripcion && s.descripcion.toLowerCase().includes(termino))
      );
    }

    // Filtrado por las reglas públicas requeridas:
    // - 'activa': Subastas en vivo listas para pujar ahora mismo
    // - 'programada': Subastas aprobadas que inician próximamente
    // - 'finalizada': Subastas terminadas en las últimas 24 horas
    // - 'todas': Todas las públicas (en vivo, programadas y finalizadas en las últimas 24h)
    let subastasFiltradas = [];

    if (estadoFiltro === 'activa') {
      subastasFiltradas = subastasFormateadas.filter((s) => s.estadoEfectivo === 'activa');
    } else if (estadoFiltro === 'programada') {
      subastasFiltradas = subastasFormateadas.filter((s) => s.estadoEfectivo === 'programada');
    } else if (estadoFiltro === 'finalizada') {
      subastasFiltradas = subastasFormateadas.filter((s) => {
        if (s.estadoEfectivo !== 'finalizada') return false;
        const fechaFin = new Date(s.fecha_cierre || s.fecha_fin || s.fecha_inicio);
        return fechaFin >= limite24Horas;
      });
    } else if (estadoFiltro === 'todas') {
      subastasFiltradas = subastasFormateadas.filter((s) => {
        if (s.estadoEfectivo === 'activa' || s.estadoEfectivo === 'programada') return true;
        if (s.estadoEfectivo === 'finalizada') {
          const fechaFin = new Date(s.fecha_cierre || s.fecha_fin || s.fecha_inicio);
          return fechaFin >= limite24Horas;
        }
        return false;
      });
    } else {
      subastasFiltradas = subastasFormateadas.filter((s) => s.estadoEfectivo === 'activa');
    }

    res.render('paginas/subastas', {
      titulo: 'Subastas - SubastasPro',
      paginaActual: 'subastas',
      subastas: subastasFiltradas,
      usuario: req.usuario || null,
      buscar: buscar || '',
      categoriaSel: categoria || 'Todas',
      estadoSel: estadoFiltro,
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
router.get('/admin', requiereSesionVista, requiereAdminVista, async (req, res) => {
  try {
    const subastas = await Subasta.findAll({
      where: { estado: 'pendiente' },
      include: [
        { model: Usuario, as: 'vendedor', attributes: ['id', 'nombre', 'correo'] },
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.render('paginas/panel-admin', {
      titulo: 'Panel Admin - SubastasPro',
      paginaActual: 'admin',
      subastas,
      usuario: req.usuario
    });
  } catch (error) {
    console.error('Error al cargar panel de administración:', error);
    res.render('paginas/panel-admin', {
      titulo: 'Panel Admin - SubastasPro',
      paginaActual: 'admin',
      subastas: [],
      usuario: req.usuario
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