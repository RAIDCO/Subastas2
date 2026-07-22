# Sistema Web de Subastas en Tiempo Real

Proyecto escolar para la gestión y participación en subastas en tiempo real.

## Stack Tecnológico
- **Backend:** Node.js, Express, Sequelize ORM, MySQL
- **Frontend:** Pug (Motor de plantillas), Tailwind CSS
- **Tiempo Real:** Socket.io
- **Autenticación:** JWT (JSON Web Tokens)
- **Despliegue:** Docker, Docker Compose

## Estructura del Proyecto

```text
├── .env.ejemplo                 # Variables de entorno de ejemplo
├── .gitignore                    # Archivos y carpetas ignorados por Git
├── Dockerfile                    # Configuración de imagen Docker para Node.js
├── docker-compose.yml            # Orquestación de app Node + MySQL
├── package.json                  # Dependencias y scripts del proyecto
├── tailwind.config.js            # Configuración de estilos Tailwind CSS
├── servidor.js                   # Punto de entrada principal (Servidor HTTP + Socket.io)
└── src/
    ├── aplicacion.js             # Configuración de la app Express (Equivalente a app.js)
    ├── configuracion/            # Configuración de base de datos y ORM
    │   └── baseDeDatos.js
    ├── controladores/            # Controladores de la API y lógica de negocio
    │   ├── administradorControlador.js
    │   ├── autenticacionControlador.js
    │   ├── pujaControlador.js
    │   ├── subastaControlador.js
    │   └── usuarioControlador.js
    ├── intermediarios/           # Middlewares (autenticacion JWT, roles, etc.)
    │   ├── autenticacionIntermediario.js
    │   └── esAdministradorIntermediario.js
    ├── modelos/                  # Modelos de Sequelize
    │   ├── categoriaModelo.js
    │   ├── index.js
    │   ├── pujaModelo.js
    │   ├── subastaModelo.js
    │   └── usuarioModelo.js
    ├── publico/                  # Archivos estáticos de la aplicación
    │   ├── css/
    │   │   ├── entrada.css
    │   │   └── estilos.css
    │   ├── imagenes/
    │   └── js/
    │       └── subasta-tiempo-real.js
    ├── rutas/                    # Definición de rutas del servidor
    │   ├── administradorRutas.js
    │   ├── autenticacionRutas.js
    │   ├── pujaRutas.js
    │   ├── subastaRutas.js
    │   ├── usuarioRutas.js
    │   └── vistasRutas.js
    ├── servicios/                # Servicios en segundo plano (Temporizador de inactividad)
    │   └── temporizadorSubastaServicio.js
    ├── sockets/                  # Eventos e integración con Socket.io
    │   └── subastaSocket.js
    ├── utilidades/               # Utilidades y constantes globales
    │   ├── constantes.js
    │   └── manejadorErrores.js
    └── vistas/                   # Plantillas Pug para el Frontend
        ├── disenos/
        │   └── principal.pug
        ├── paginas/
        │   ├── crear-subasta.pug
        │   ├── detalle-subasta.pug
        │   ├── iniciar-sesion.pug
        │   ├── inicio.pug
        │   ├── panel-admin.pug
        │   ├── registro.pug
        │   └── subastas.pug
        └── parciales/
            ├── encabezado.pug
            ├── navegacion.pug
            └── pie.pug
```

## Instrucciones de Inicio

1. Copiar el archivo `.env.ejemplo` a `.env` y configurar las variables necesarias:
   ```bash
   cp .env.ejemplo .env
   ```

2. Ejecución con Docker Compose:
   ```bash
   docker-compose up --build
   ```
