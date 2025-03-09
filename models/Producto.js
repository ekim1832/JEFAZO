// models/Producto.js
 
const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { 
    type: String,
    required: true,
   /* enum: [
      // Comidas
      'POLLO', 'CARNE', 'CHULETA', 'COSTILLA', 'BORREGO', 'PARRILLA', 'CHUZOS',
      // Bebidas
      'COLA_PERSONAL', 'COLA_1.75', 'JUGOS',
      // Extras
      'BANDEJA_PLASTICA', 'CHUZO', 'MENESTRA', 'ARROZ'
    ]*/
  }, 

  categoria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categoria',
    required: true
  },
  
  tipoPrecio: {
    type: String,
    required: true,
    enum: ['MULTIPLE', 'UNICO'],
    default: 'UNICO'
  },
  precios: {
    precioUnico: { 
      type: Number,
      required: function() {
        return this.tipoPrecio === 'UNICO';
      }
    },
    precioMesa: { 
      type: Number,
      required: function() {
        return this.tipoPrecio === 'MULTIPLE';
      }
    },
    precioLlevar: { 
      type: Number,
      required: function() {
        return this.tipoPrecio === 'MULTIPLE';
      }
    },
    precioPorcion: { 
      type: Number,
      required: function() {
        return this.tipoPrecio === 'MULTIPLE';
      }
    },
    precioPorcionLlevar: { 
      type: Number,
      required: function() {
        return this.tipoPrecio === 'MULTIPLE';
      }
    }
  },
  
  tiempoPreparacion: {
    type: Number, // en minutos
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});
 
 

const Producto = mongoose.model('Producto', productoSchema);
module.exports = Producto;