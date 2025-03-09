const mongoose = require('mongoose');

const cajaSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  apertura: {
    fecha: {
      type: Date,
      required: true,
      default: Date.now
    },
    monto: {
      type: Number,
      required: true
    },
    observaciones: {
      type: String,
      default: ''
    }
  },
  cierre: {
    fecha: Date,
    monto: Number,
    diferencia: Number,
    observaciones: String
  },
  estado: {
    type: String,
    enum: ['abierta', 'cerrada'],
    default: 'abierta'
  },
  ventas: [{
    pedido: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pedido'
    },
    cobro: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cobro'
    },
    monto: Number,
    metodoPago: {
      type: String,
      enum: ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'],
      required: true
    },
    fecha: {
      type: Date,
      default: Date.now
    }
  }],
  resumen: {
    efectivo: {
      total: { type: Number, default: 0 },
      cantidad: { type: Number, default: 0 }
    },
    tarjeta: {
      total: { type: Number, default: 0 },
      cantidad: { type: Number, default: 0 }
    },
    transferencia: {
      total: { type: Number, default: 0 },
      cantidad: { type: Number, default: 0 }
    },
    totalGeneral: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para calcular el total teórico en efectivo
cajaSchema.virtual('totalEfectivoTeorico').get(function() {
  return this.apertura.monto + this.resumen.efectivo.total;
});

// Método para agregar una venta
cajaSchema.methods.agregarVenta = function(pedidoId, cobroId, monto, metodoPago) {
  // Agregar a la lista de ventas
  this.ventas.push({
    pedido: pedidoId,
    cobro: cobroId,
    monto: monto,
    metodoPago: metodoPago,
    fecha: new Date()
  });
  
  // Actualizar el resumen
  if (metodoPago === 'EFECTIVO') {
    this.resumen.efectivo.total += monto;
    this.resumen.efectivo.cantidad += 1;
  } else if (metodoPago === 'TARJETA') {
    this.resumen.tarjeta.total += monto;
    this.resumen.tarjeta.cantidad += 1;
  } else if (metodoPago === 'TRANSFERENCIA') {
    this.resumen.transferencia.total += monto;
    this.resumen.transferencia.cantidad += 1;
  }
  
  this.resumen.totalGeneral += monto;
  return this;
};

// Método para cerrar la caja
cajaSchema.methods.cerrarCaja = function(montoCierre, observaciones = '') {
  if (this.estado === 'cerrada') {
    throw new Error('La caja ya está cerrada');
  }
  
  const totalTeorico = this.apertura.monto + this.resumen.efectivo.total;
  const diferencia = montoCierre - totalTeorico;
  
  this.cierre = {
    fecha: new Date(),
    monto: montoCierre,
    diferencia: diferencia,
    observaciones: observaciones
  };
  
  this.estado = 'cerrada';
  return this;
};

// Exportar el modelo
const Caja = mongoose.model('Caja', cajaSchema);
module.exports = Caja;