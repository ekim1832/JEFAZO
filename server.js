// Descripción: Archivo principal de la API Jefazo-Comanda.
 
const path = require('path');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

 
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado a MongoDB: Jefazo-Comanda'))
  .catch(err => console.error('Error conectando a MongoDB:', err));

// Hacer io accesible para las rutas
app.set('io', io);

// Configuración de WebSocket
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('join-kitchen', () => {
    socket.join('cocina');
    console.log('Usuario unido a cocina');
  });

  socket.on('join-grill', () => {
    socket.join('parrilla');
    console.log('Usuario unido a parrilla');
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ mensaje: 'API Jefazo-Comanda' });
});

app.use('/reports', express.static(path.join(__dirname, 'public/reports')));

// Importar rutas
const authRoutes = require('./routes/auth');
const categoriasRoutes = require('./routes/categorias');
const productosRoutes = require('./routes/productos');
const pedidosRoutes = require('./routes/pedidos');
const cajasRoutes = require('./routes/cajas');
const usuariosRoutes = require('./routes/usuarios');
const clientesRoutes = require('./routes/clientes');
const cobrosRoutes = require('./routes/cobros');
const reportsRoutes = require('./routes/reports'); 

// Rutas 
app.use('/api/usuarios', usuariosRoutes);
 app.use('/api/auth', authRoutes);
 app.use('/api/categorias', categoriasRoutes);
 app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/cajas', cajasRoutes);  
app.use('/api/clientes', clientesRoutes);  
app.use('/api/cobros', cobrosRoutes);
app.use('/api/reports', reportsRoutes); 

// Ruta de prueba////////////////// 
app.get('/', (req, res) => {
  res.json({ mensaje: 'API Jefazo-Comanda' });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ mensaje: 'Error en el servidor' });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});