// models/Cobro.js
const mongoose = require('mongoose');

const cobroItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PedidoItem',
    required: true
  },
  nombre: {
    type: String,
    required: true
  },
  cantidad: {
    type: Number,
    required: true,
    min: 0.01,
    default: 1
  },
  precioUnitario: {
    type: Number,
    required: true,
    min: 0
  },
  precioTotal: {
    type: Number,
    required: true,
    min: 0
  }
});

const cobroSchema = new mongoose.Schema({
  pedido: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pedido',
    required: true
  },
  tipoCobro: {
    type: String,
    enum: ['COMPLETO', 'PARCIAL'],
    required: true
  },
  itemsCobrados: [cobroItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  iva: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  metodoPago: {
    type: String,
    enum: ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'],
    required: true
  },
  estado: {
    type: String,
    enum: ['COMPLETADO', 'ANULADO'],
    default: 'COMPLETADO'
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  facturado: {
    type: Boolean,
    default: false
  },
  datosFactura: {
    numeroFactura: String,
    fecha: Date
  },
  cajero: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  observaciones: {
    type: String,
    default: ''
  },
  caja: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Caja'
  }
}, {
  timestamps: true
});

// Pre-save middleware para calcular totales
cobroSchema.pre('save', function(next) {
  // Calcular subtotal basado en los items
  this.subtotal = this.itemsCobrados.reduce((sum, item) => sum + item.precioTotal, 0);
  
  // Calcular IVA (asumiendo un 12%)
  // Esto podría extraerse a una configuración global
   // Calcular total
   this.total = this.subtotal;  //+ this.iva;
  const ivaRate = 1.15;
  this.subtotal = (this.subtotal / ivaRate).toFixed(2); 
  this.iva = (this.total - this.subtotal).toFixed(2) ; 

  
  next();
});

// Método para anular un cobro
cobroSchema.methods.anular = async function(motivo) {
  this.estado = 'ANULADO';
  this.observaciones = motivo || 'Cobro anulado sin motivo especificado';
  await this.save();
  return this;
};

 // Método estático para verificar si un pedido está completamente cobrado
cobroSchema.statics.verificarPedidoCobrado = async function(pedidoId) {
  try {
   // console.log('********Verificando cobro de pedido:*********', pedidoId);
    
    // Obtener el pedido con productos populados
    const pedido = await mongoose.model('Pedido')
      .findById(pedidoId)
      .populate('items.producto'); // Aquí populamos los productos
    
    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }
    
    //console.log('Obtener todos los cobros COMPLETADOS de este pedido', pedidoId);
    
    // Obtener todos los cobros COMPLETADOS de este pedido
    const cobros = await this.find({
      pedido: pedidoId,
      estado: 'COMPLETADO'
    });
    
   // console.log('Contabilizar todos los items cobrados', pedidoId);
    
    // Si no hay cobros, el pedido no está cobrado
    if (cobros.length === 0) {
      return {
        cobrado: false,
        porcentaje: 0,
        itemsFaltantes: pedido.items // Ya tiene los productos populados
      };
    }
    
    console.log('Verificar si todos los items del pedido han sido cobrados', pedidoId);
    
    // Contabilizar todos los items cobrados
    const itemsCobrados = {};
    
    cobros.forEach(cobro => {
      cobro.itemsCobrados.forEach(item => {
        if (!itemsCobrados[item.itemId]) {
          itemsCobrados[item.itemId] = 0;
        }
        itemsCobrados[item.itemId] += item.cantidad;
      });
    });
    
    console.log('Preparando itemsFaltantes', pedidoId);
    
    // Verificar si todos los items del pedido han sido cobrados
    const itemsFaltantes = [];
    let totalItems = 0;
    let totalCobrados = 0;
    
    pedido.items.forEach(item => {
      totalItems += item.cantidad;
      
      const cantidadCobrada = itemsCobrados[item._id] || 0;
      totalCobrados += cantidadCobrada;
      
      if (cantidadCobrada < item.cantidad) {
        // Añadir a la lista de items faltantes con producto ya populado
        itemsFaltantes.push({
          ...item.toObject(), // Esto mantiene el producto populado
          cantidadPendiente: item.cantidad - cantidadCobrada
        });
      }
    });
    
    const porcentajeCobrado = totalItems > 0 ? (totalCobrados / totalItems) * 100 : 0;
    
    // Verificar que los productos estén populados correctamente
    if (itemsFaltantes.length > 0 && itemsFaltantes[0].producto) {
      console.log('Ejemplo de producto populado:', 
        typeof itemsFaltantes[0].producto === 'object' ? 
        'Objeto con propiedades: ' + Object.keys(itemsFaltantes[0].producto).join(', ') : 
        'No es un objeto: ' + typeof itemsFaltantes[0].producto);
    }
    
    return {
      cobrado: itemsFaltantes.length === 0,
      porcentaje: porcentajeCobrado,
      itemsFaltantes
    };
  } catch (error) {
    console.error('Error verificando cobro de pedido:', error);
    throw error;
  }
};

const Cobro = mongoose.model('Cobro', cobroSchema);
module.exports = Cobro;