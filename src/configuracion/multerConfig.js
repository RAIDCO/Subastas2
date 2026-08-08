// Configuración de Multer para subir imágenes de subastas
const multer = require("multer");
const path = require("path");
const fs = require("fs");

//====================================
// DIRECTORIO DE SUBIDA
//====================================

const DIRECTORIO_SUBIDAS = path.join(__dirname, "..", "publico", "uploads");

// Crear el directorio si no existe
if (!fs.existsSync(DIRECTORIO_SUBIDAS)) {
    fs.mkdirSync(DIRECTORIO_SUBIDAS, { recursive: true });
}

//====================================
// ALMACENAMIENTO EN DISCO
//====================================

const almacenamiento = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, DIRECTORIO_SUBIDAS);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const nombreUnico = `subasta-${Date.now()}-${Math.round(Math.random() * 1e6)}${extension}`;
        cb(null, nombreUnico);
    }
});

//====================================
// FILTRO DE ARCHIVOS (solo imágenes)
//====================================

const filtroArchivo = (req, file, cb) => {
    const tiposPermitidos = /jpeg|jpg|png|gif|webp/;
    const extensionValida = tiposPermitidos.test(path.extname(file.originalname).toLowerCase());
    const mimeValido = tiposPermitidos.test(file.mimetype.split("/")[1]);

    if (extensionValida && mimeValido) {
        cb(null, true);
    } else {
        cb(new Error("Solo se permiten imágenes (JPG, PNG, GIF, WEBP)."), false);
    }
};

//====================================
// INSTANCIA DE MULTER
//====================================

const subirImagen = multer({
    storage: almacenamiento,
    fileFilter: filtroArchivo,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB máximo
    }
});

//====================================
// ELIMINAR IMAGEN DEL DISCO
//====================================

const eliminarImagen = (rutaRelativa) => {
    if (!rutaRelativa) return;

    // La ruta almacenada es "/uploads/nombre.jpg", convertir a ruta absoluta
    const nombreArchivo = path.basename(rutaRelativa);
    const rutaAbsoluta = path.join(DIRECTORIO_SUBIDAS, nombreArchivo);

    fs.unlink(rutaAbsoluta, (err) => {
        if (err && err.code !== "ENOENT") {
            console.error(`[Uploads] Error al eliminar ${nombreArchivo}:`, err.message);
        } else {
            console.log(`[Uploads] Imagen eliminada: ${nombreArchivo}`);
        }
    });
};

module.exports = {
    subirImagen,
    eliminarImagen,
    DIRECTORIO_SUBIDAS
};
