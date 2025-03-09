// models/Categoria.js
const mongoose = require('mongoose');

const categoriaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
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

// Middleware para actualizar updatedAt antes de cada actualización
categoriaSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Categoria = mongoose.model('Categoria', categoriaSchema);
module.exports = Categoria;