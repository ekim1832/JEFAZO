// models/Pedido.js

const mongoose = require('mongoose');
 
// Esquema para cada item del pedido
const pedidoItemSchema = new mongoose.Schema({
  producto: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Producto',
    required: true
  },
  cantidad: { 
    type: Number, 
    required: true,
    default: 1,
    min: 1
  },
  precioUnitario: { 
    type: Number, 
    required: true 
  },
  precioTotal: {
    type: Number,
    required: true
  },
  // Separación por áreas
  //parrilla: itemParrillaSchema,
  //cocina: itemCocinaSchema,
  // Datos generales del item
  esPorcion: {
    type: Boolean,
    required: true,
    default: false
  },
  paraLlevar: { 
    type: Boolean, 
    required: true,
    default: false
  },
  tipoArroz: { 
    type: String,
    enum: ['MORO', 'BLANCO', 'NINGUNO'],
    required: true,
    default: 'NINGUNO'
  },

  observaciones: {
    type: String, 
    default: ''
  },
  estadoitem: {
    type: String,
    enum: ['PENDIENTE', 'EN_PROCESO',  'LISTO' ,'CANCELADO'],
    default: 'PENDIENTE'
  },
  tipoServido: {
    type: String,
    enum: ['MESA', 'LLEVAR'],
    default: 'MESA' 
  },
  tiempoEstimado: {
    type: Number, // en minutos
    required: true
  }
});

// Esquema principal del pedido
const pedidoSchema = new mongoose.Schema({
  // Información básica
  numeroMesa: { 
    type: Number, 
    required: true 
  },
  mesero: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Usuario', 
    required: true 
  },
  tipoServido: {
    type: String,
    enum: ['MESA', 'LLEVAR'],
    default: 'MESA' 
  },
  // Estado del pedido
  estado: {
    type: String,
    enum: ['PENDIENTE', 'EN_PROCESO',  'ENTREGADO', 'COMPLETADO', 'CANCELADO'],
    default: 'PENDIENTE'
  },
  // Items del pedido
  items: [pedidoItemSchema],
  // Información de pago
  metodoPago: {
    type: String,
    enum: ['EFECTIVO', 'TRANSFERENCIA'],
    required: true
  },
  // Información del cliente y facturación
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  requiereFactura: {
    type: Boolean,
    default: false
  },
  datosFactura: {
    numeroFactura: {
      type: String,
      unique: true,
      sparse: true // Permite null/undefined
    },
    fechaEmision: Date
  },
  // Totales
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  total: { 
    type: Number, 
    required: true,
    min: 0
  },
  // Control de tiempo
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  completadoAt: {
    type: Date
  },
  tiempoPreparacionTotal: {
    type: Number,
    required: true
  }
});

// Middleware para actualización de fechas
pedidoSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.isModified('estado') && this.estado === 'COMPLETADO') {
    this.completadoAt = new Date();
  }
  next();
});

// Middleware para cálculo de precios
pedidoSchema.pre('save', function(next) {
  let subtotal = 0;
  this.items.forEach(item => {
    item.precioTotal = item.precioUnitario * item.cantidad;
    subtotal += item.precioTotal;
  });
  
  this.subtotal = subtotal;
  this.total = subtotal; // Aquí se pueden agregar impuestos o descuentos si es necesario
  next();
});

// Middleware para cálculo de tiempo de preparación
pedidoSchema.pre('save', function(next) {
  const tiemposPreparacion = this.items.map(item => item.tiempoEstimado);
  this.tiempoPreparacionTotal = Math.max(...tiemposPreparacion);
  next();
});

// Métodos estáticos para consultas
pedidoSchema.statics = {
  // Obtener pedidos para parrilla
  obtenerPedidosParrilla: function() {
    return this.find({
      estado: { $nin: ['COMPLETADO', 'CANCELADO'] },
      'items.parrilla': { $exists: true }
    })
    .select('numeroMesa items.parrilla createdAt')
    .sort('createdAt');
  },

  // Obtener pedidos para cocina
  obtenerPedidosCocina: function() {
    return this.find({
      estado: { $nin: ['COMPLETADO', 'CANCELADO'] },
      'items.cocina': { $exists: true }
    })
    .select('numeroMesa items.cocina createdAt')
    .sort('createdAt');
  },

  // Buscar pedidos por mesa
  buscarPorMesa: function(numeroMesa) {
    return this.find({ 
      numeroMesa,
      estado: { $nin: ['COMPLETADO', 'CANCELADO'] }
    })
    .populate('cliente')
    .sort('-createdAt');
  },

  // Obtener pedidos por rango de fechas
  obtenerPorRangoFechas: function(fechaInicio, fechaFin) {
    return this.find({
      createdAt: {
        $gte: fechaInicio,
        $lte: fechaFin
      }
    })
    .populate('cliente')
    .sort('-createdAt');
  }
};

// Método para actualizar el estado de un item en el modelo Pedido
pedidoSchema.methods.actualizarEstadoItem = async function(itemId, area, estado, razon) {
  const itemIndex = this.items.findIndex(item => item._id.toString() === itemId);
  
  if (itemIndex === -1) {
    throw new Error('Item no encontrado en el pedido');
  }
  
  // Actualizar el estado del item
  this.items[itemIndex].estadoitem = estado;
  
  // Si se proporciona una razón (para items cancelados)
  if (razon) {
    this.items[itemIndex].razonCancelacion = razon;
  }
  
  // Guardamos y retornamos el pedido actualizado
  return await this.save();
};

// Método para marcar el pedido como entregado
pedidoSchema.methods.marcarEntregado = async function() {
  // Cambiar estado del pedido a ENTREGADO
  this.estado = 'ENTREGADO';
  
  // Opcionalmente, marcar todos los items como LISTO
  this.items.forEach(item => {
    if (item.estadoitem !== 'CANCELADO') {
      item.estadoitem = 'LISTO';
    }
  });
  
  // Actualizar timestamp
  this.updatedAt = new Date();
  
  // Guardar y devolver el pedido actualizado
  return await this.save();
};

// Método para obtener el estado de cobro
pedidoSchema.methods.obtenerEstadoCobro = async function() {
  try {
    return await mongoose.model('Cobro').verificarPedidoCobrado(this._id);
  } catch (error) {
    console.error('Error obteniendo estado de cobro:', error);
    throw error;
  }
};

// Método para marcar como completado
pedidoSchema.methods.marcarCompletado = async function() {
  this.estado = 'COMPLETADO';
  this.completadoAt = new Date();
  return await this.save();
};
// Método para marcar como completado
pedidoSchema.methods.marcarPendiente = async function() { 
  if (this.estado === 'ENTREGADO') {
    this.estado = 'PENDIENTE';
    // No modificamos completadoAt para mantener un registro
    return await this.save();
  }
  return this;
};

// Método para volver a ENTREGADO desde COMPLETADO
pedidoSchema.methods.volverAEntregado = async function() {
  if (this.estado === 'COMPLETADO') {
    this.estado = 'ENTREGADO';
    // No modificamos completadoAt para mantener un registro
    return await this.save();
  }
  return this;
};

const Pedido = mongoose.model('Pedido', pedidoSchema);
module.exports = Pedido;