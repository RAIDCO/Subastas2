# 📋 Asignación de Tareas y Arquitectura del Proyecto - SubastasPro

Este documento detalla las tareas específicas para cada uno de los 4 integrantes del equipo y el líder de proyecto.

---

## 🎨 Paleta de Colores y Estilo Visual del Proyecto
Para mantener consistencia en todo el sitio (basado en las maquetas aprobadas):
- **Fondo principal:** Modo oscuro profundo (`bg-slate-950` / `#090d10`).
- **Color de Acento / Marca:** Verde esmeralda (`#10b981` / `#059669`).
- **Texto:** Blanco para títulos (`text-white`), Gris claro/medio para descripciones (`text-slate-400`).
- **Tarjetas y Contenedores:** Fondo oscuro translúcido con bordes finos (`bg-slate-900/60 border border-slate-800`).

---

## 👨‍💻 Tarea 1: Base de Datos, Modelos Sequelize y Relaciones
**Responsable:** Integrante 1  
**Objetivo:** Crear el esquema completo de la base de datos en Sequelize y conectar con Supabase.

### Archivos a Modificar / Crear:
1. `src/configuracion/baseDeDatos.js`
   - Verificar la conexión a Supabase usando `Sequelize` y la variable `BD_URL`.
2. `src/modelos/usuarioModelo.js`
   - Definir esquema: `id`, `nombre`, `correo`, `clave` (hash), `rol` ('usuario' / 'administrador'), `creado_en`.
3. `src/modelos/subastaModelo.js`
   - Definir esquema: `id`, `titulo`, `descripcion`, `imagen_url`, `precio_inicial`, `precio_actual`, `estado` ('pendiente', 'activa', 'finalizada', 'rechazada'), `tiempo_inactividad_minutos`, `fecha_fin`, `usuario_id`, `categoria_id`.
4. `src/modelos/pujaModelo.js`
   - Definir esquema: `id`, `monto`, `subasta_id`, `usuario_id`, `creado_en`.
5. `src/modelos/categoriaModelo.js`
   - Definir esquema: `id`, `nombre`, `descripcion`.
6. `src/modelos/index.js`
   - Definir las asociaciones/relaciones Sequelize:
     - Un Usuario tiene muchas Subastas (`hasMany`) y una Subasta pertenece a un Usuario (`belongsTo`).
     - Una Subasta pertenece a una Categoría (`belongsTo`).
     - Una Subasta tiene muchas Pujas (`hasMany`).
     - Una Puja pertenece a un Usuario y a una Subasta.
   - Exportar todos los modelos y el objeto `sequelize`.

---

## 🔐 Tarea 2: Autenticación, Seguridad y Middleware JWT
**Responsable:** Integrante 2  
**Objetivo:** Implementar la lógica backend de registro, inicio de sesión y protección de rutas con JWT.

### Archivos a Modificar / Crear:
1. `src/controladores/autenticacionControlador.js`
   - Función `registrarUsuario`: Validar campos, encriptar contraseña con `bcryptjs`, guardar en base de datos.
   - Función `iniciarSesion`: Verificar correo y contraseña, generar token JWT si coincide.
2. `src/rutas/autenticacionRutas.js`
   - Definir endpoints POST: `/api/autenticacion/registro` y `/api/autenticacion/login`.
3. `src/intermediarios/autenticacionIntermediario.js`
   - Middleware para interceptar peticiones, extraer el token JWT (de headers `Authorization` o Cookie) y verificar su validez.
4. `src/intermediarios/esAdministradorIntermediario.js`
   - Middleware para comprobar que el usuario autenticado tenga `rol === 'administrador'`.

---

## 🖼️ Tarea 3: Frontend - Landing Page / Página de Inicio
**Responsable:** Integrante 3  
**Objetivo:** Construir la vista de la Landing Page en Pug + Tailwind CSS tal como se aprobó en la maqueta visual.

### Archivos a Modificar / Crear:
1. `src/vistas/paginas/inicio.pug`
   - Incluir la barra de navegación superior (Logo "SubastasPro", enlaces `#inicio`, `#como-funciona`, `#subastas-destacadas`, `#caracteristicas`, y botones "Iniciar Sesión" y "Registrarse").
   - **Sección Hero:** Título "Puja y gana en tiempo real sin interrupciones" con resaltado verde esmeralda y la tarjeta de vista previa de subasta.
   - **Sección Cómo Funciona:** Tarjetas numeradas (1. Regístrate, 2. Elige o publica, 3. Puja en tiempo real, 4. ¡Gana el último postor!).
   - **Sección Subastas Destacadas:** Grid preparado para iterar `each subasta in subastasDestacadas`. *Nota: Dejar la estructura lista y vacía/con datos de prueba hasta conectar la BD.*
   - **Sección Características Principales:** Tarjetas para Regla de inactividad, Aprobación de admins y Notificaciones en vivo.
   - **Pie de página (Footer):** Enlaces rápidos, sección legal y formulario de suscripción.
2. `src/rutas/vistasRutas.js`
   - Modificar la ruta `GET /` para pasar datos temporales o plantilla a `inicio.pug`.

---

## 🔑 Tarea 4: Frontend - Vistas de Registro e Iniciar Sesión
**Responsable:** Integrante 4  
**Objetivo:** Construir los formularios visuales de Iniciar Sesión y Registro alineados al diseño esmeralda y oscuro.

### Archivos a Modificar / Crear:
1. `src/vistas/paginas/iniciar-sesion.pug`
   - Formulario limpio con campos: Correo electrónico, Contraseña, botón de submit "Iniciar Sesión" y enlace hacia registro.
2. `src/vistas/paginas/registro.pug`
   - Formulario con campos: Nombre completo, Correo electrónico, Contraseña, Confirmar contraseña, casilla de términos y botón "Registrarse".
3. `src/rutas/vistasRutas.js`
   - Registrar las rutas GET `/iniciar-sesion` y GET `/registro` para renderizar las vistas Pug correspondientes.
4. `src/publico/js/autenticacion-cliente.js` *(Opcional)*
   - Script cliente en navegador para enviar datos por `fetch()` a los endpoints `/api/autenticacion/login` y `/api/autenticacion/registro` creados por la Persona 2.

---

## 🚀 Tarea Líder (Tú): Docker, Coordinación e Integración
**Responsable:** Líder de Proyecto  
**Objetivo:** Coordinar la integración de los módulos, entorno Docker y servidor.

### Archivos a Cargo:
1. `servidor.js` y `src/aplicacion.js` (Integrar las rutas creadas por el equipo).
2. `Dockerfile` y `docker-compose.yml` (Mantener el contenedor listo).
3. `.env` (Administrar las variables de entorno para todo el equipo).
