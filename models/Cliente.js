// models/Cliente.js

const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  // Información básica
  tipoCliente: {
    type: String,
    enum: ['CONSUMIDOR_FINAL', 'REGISTRADO'],
    default: 'CONSUMIDOR_FINAL'
  }, 
  nombre: {
    type: String,
    required: function() {
      return this.tipoCliente === 'REGISTRADO';
    },
    trim: true
  },
  // Información de facturación
  identificacion: {
    tipo: {
      type: String,
      enum: ['CEDULA', 'RUC', 'PASAPORTE'],
      required: function() {
        return this.tipoCliente === 'REGISTRADO';
      }
    },
    numero: {
      type: String,
      required: function() {
        return this.tipoCliente === 'REGISTRADO';
      },
      trim: true
    }
  },
  direccion: {
    calle: {
      type: String, 
      trim: true
    },
    ciudad: {
      type: String,
      trim: true
    },
    provincia: {
      type: String,
      enum: [
        
        'GUAYAS', 'PICHINCHA','LOS RIOS',
        // Región Costa 
        'ESMERALDAS', 'MANABÍ',  'SANTA ELENA', 'EL ORO', 'SANTO DOMINGO DE LOS TSÁCHILAS',
      
        // Región Sierra
        'CARCHI', 'IMBABURA',  'COTOPAXI', 'TUNGURAHUA',
       'BOLÍVAR', 'CHIMBORAZO', 'CAÑAR', 'AZUAY', 'LOJA',
      
        // Región Amazónica
       'SUCUMBÍOS', 'NAPO', 'ORELLANA', 'PASTAZA', 'MORONA SANTIAGO', 'ZAMORA CHINCHIPE',
      
        // Región Insular
        'GALÁPAGOS'
      ],
      trim: true
    }
  },
  contacto: {
    telefono: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  // Control
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
 
// Middleware para actualizar la fecha
clienteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Método estático para obtener o crear el consumidor final
clienteSchema.statics.obtenerConsumidorFinal = async function() {
  try {
    let consumidorFinal = await this.findOne({ tipoCliente: 'CONSUMIDOR_FINAL' });
    
    if (!consumidorFinal) {
      consumidorFinal = await this.create({
        tipoCliente: 'CONSUMIDOR_FINAL',
        nombre: 'CONSUMIDOR FINAL',
        isActive: true
      });
    }
    
    return consumidorFinal;
  } catch (error) {
    console.error('Error al obtener consumidor final:', error);
    throw error;
  }
};

// Método estático para buscar cliente por identificación
clienteSchema.statics.buscarPorIdentificacion = function(tipo, numero) {
  return this.findOne({
    'identificacion.tipo': tipo,
    'identificacion.numero': numero,
    isActive: true
  });
};

const Cliente = mongoose.model('Cliente', clienteSchema);

module.exports = Cliente; 