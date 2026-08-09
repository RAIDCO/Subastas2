const express = require('express');
const router = express.Router();
const { Subasta, Usuario, Categoria } = require('../modelos');

const { requiereSesionVista, cargarUsuarioSiExiste, requiereAdminVista } = require('../intermediarios/autenticacionIntermediario');
const { limpiarCookieToken } = require('../utilidades/tokenJwt');
const { obtenerHistorialUsuario } = require('../controladores/usuarioControlador');
const { mostrarDetalleSubasta, mostrarFormularioCrear } = require('../controladores/subastaControlador');
const { obtenerEstadoEfectivo } = require('../utilidades/fechas');

// Ruta principal / Landing Page
router.get('/', async (req, res) => {
  try {
    // Obtener subastas activas para mostrar en la landing page
    const subastas = await Subasta.findAll({
      where: { estado: 'activa' },
      include: [
        { model: Usuario, as: 'vendedor', attributes: ['id', 'nombre'] },
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }
      ],
      order: [['created_at', 'DESC']]
    });

    // Mezclar aleatoriamente y tomar máximo 6
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

// Catálogo de subastas activas
router.get('/subastas', cargarUsuarioSiExiste, async (req, res) => {
  try {
    const subastas = await Subasta.findAll({
      where: { estado: 'activa' },
      include: [
        { model: Usuario, as: 'vendedor', attributes: ['id', 'nombre'] },
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }
      ],
      order: [['created_at', 'DESC']]
    });

    // Formatear para la vista
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
      fecha_fin: s.fecha_fin
    }));

    res.render('paginas/subastas', {
      titulo: 'Subastas Activas - SubastasPro',
      paginaActual: 'subastas',
      subastas: subastasFormateadas,
      usuario: req.usuario || null
    });
  } catch (error) {
    console.error('Error al cargar subastas:', error.message);
    res.render('paginas/subastas', {
      titulo: 'Subastas Activas - SubastasPro',
      paginaActual: 'subastas',
      subastas: [],
      usuario: req.usuario || null
    });
  }
});

// Detalle de una subasta individual (carga datos del usuario si hay sesión)
router.get('/subastas/:id', cargarUsuarioSiExiste, mostrarDetalleSubasta);

// Crear subasta (protegida: requiere sesión)
router.get('/crear-subasta', requiereSesionVista, mostrarFormularioCrear);

// Historial de subastas (ruta protegida: sin sesión redirige al login)
router.get('/historial', requiereSesionVista, obtenerHistorialUsuario);

// Panel de administración (protegido: requiere sesión + rol admin)
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
    res.render('paginas/panel-admin', {
      titulo: 'Panel Admin - SubastasPro',
      paginaActual: 'admin',
      subastas: [],
      usuario: req.usuario
    });
  }
});

// Cerrar sesión (GET /cerrar-sesion) — limpia la cookie y redirige a la landing
router.get('/cerrar-sesion', (req, res) => {
  limpiarCookieToken(res);
  // También limpiar localStorage en el cliente no es posible desde el servidor,
  // pero la cookie es lo que importa para las vistas Pug.
  res.redirect('/');
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

module.exports = router;