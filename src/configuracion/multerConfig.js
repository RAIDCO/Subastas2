// Configuración de Multer para subir imágenes de subastas (Cloudinary + Local Fallback)
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

//====================================
// CREDENCIALES DE CLOUDINARY
//====================================

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

let almacenamiento;

if (cloudName && apiKey && apiSecret && cloudName !== "tu_cloud_name") {
    // Configurar cliente de Cloudinary
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
    });

    // Storage de Multer conectado directamente a Cloudinary
    almacenamiento = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: "subastas_pro",
            allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
            transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }]
        }
    });

    console.log("[Uploads] Almacenamiento en la nube activo con Cloudinary.");
} else {
    // Fallback: almacenamiento local en /publico/uploads
    const DIRECTORIO_SUBIDAS = path.join(__dirname, "..", "publico", "uploads");

    if (!fs.existsSync(DIRECTORIO_SUBIDAS)) {
        fs.mkdirSync(DIRECTORIO_SUBIDAS, { recursive: true });
    }

    almacenamiento = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, DIRECTORIO_SUBIDAS);
        },
        filename: (req, file, cb) => {
            const extension = path.extname(file.originalname).toLowerCase();
            const nombreUnico = `subasta-${Date.now()}-${Math.round(Math.random() * 1e6)}${extension}`;
            cb(null, nombreUnico);
        }
    });

    console.log("[Uploads] Credenciales de Cloudinary no detectadas. Usando carpeta local /uploads.");
}

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

// Middleware para subir imagen principal + hasta 5 imágenes adicionales para la galería
const subirImagenesGaleria = subirImagen.fields([
    { name: "imagen", maxCount: 1 },
    { name: "imagenes_extra", maxCount: 5 }
]);

const eliminarImagen = () => {
    // Las imágenes se mantienen almacenadas en la nube/servidor de forma permanente
};

module.exports = {
    subirImagen,
    subirImagenesGaleria,
    eliminarImagen
};
