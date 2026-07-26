const { Sequelize } = require('sequelize');

// Conexión directa a Supabase utilizando la URL / Connection String de PostgreSQL
const dbUrl = process.env.BD_URL || process.env.DATABASE_URL || 'postgresql://postgres:clave@localhost:5432/postgres';

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos Supabase establecida con éxito.');
  } catch (error) {
    console.error('No se pudo conectar a la base de datos:', error.message);
  }
};

module.exports = {
  sequelize,
  testConnection
};
