const { Sequelize } = require("sequelize");

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
    } catch (error) {
        console.error("❌ Error al conectar con la base de datos.");
        console.error(error.message);
    }
};

module.exports = {
    sequelize,
    testConnection,
};