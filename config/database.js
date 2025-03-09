const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb://localhost:27017/Jefazo-comanda', {
     // useNewUrlParser: true,
    // useUnifiedTopology: true,
      // Configuración para mejor rendimiento
     // poolSize: 50, // Aumenta el pool de conexiones
      autoIndex: true, // Mantiene índices para búsquedas rápidas
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Conectado: ${conn.connection.host}`);
  } catch (err) {
    console.error('Error de conexión MongoDB:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;