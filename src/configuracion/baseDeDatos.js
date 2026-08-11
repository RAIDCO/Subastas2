const { Sequelize } = require("sequelize");
const pg = require("pg");

// Configurar parser para OID 1114 (TIMESTAMP WITHOUT TIME ZONE) en PostgreSQL
// Supabase/Postgres almacena timestamps sin zona horaria en UTC.
// Este parser evita que el driver 'pg' agregue el offset local del servidor al leer de la BD.
pg.types.setTypeParser(1114, (str) => {
    if (!str) return null;
    return new Date(str.replace(" ", "T") + "Z");
});

// Obtiene la URL de conexión desde el archivo .env
const dbUrl =
    process.env.BD_URL ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:clave@localhost:5432/postgres";

// Crear la conexión con PostgreSQL (Supabase)
const sequelize = new Sequelize(dbUrl, {
    dialect: "postgres",

    logging: false,

    define: {
        freezeTableName: true,
    },

    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false,
        },
    },

    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
});

// Probar la conexión con la base de datos
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log("✅ Conexión a Supabase establecida correctamente.");
        await sequelize.query(`
            ALTER TABLE subastas ADD COLUMN IF NOT EXISTS imagenes_urls JSONB DEFAULT '[]'::jsonb;
        `).catch(() => {});
        await sequelize.sync();
        console.log("✅ Tablas de la base de datos sincronizadas.");
    } catch (error) {
        console.error("❌ Error al conectar con la base de datos.");
        console.error(error.message);
    }
};

module.exports = {
    sequelize,
    testConnection,
};