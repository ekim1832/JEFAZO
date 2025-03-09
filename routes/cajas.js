// routes/caja.js
const express = require('express');
const router = express.Router();
const { Caja } = require('../models');

// IMPORTANTE: Coloca las rutas específicas ANTES que las rutas con parámetros

// 1. RUTAS ESPECÍFICAS PRIMERO
// Verificar caja abierta
router.get('/verificar', async (req, res) => {
  try {
    const usuarioId = req.query.usuario; 
    
    if (!usuarioId) {
      return res.status(400).json({
        success: false,
        message: 'requiere ID de usuario'
      });
    }
    
    const cajaAbierta = await Caja.findOne({
      usuario: usuarioId,
      estado: 'abierta'
    }).select('_id apertura.fecha apertura.monto');
    
    res.json({
      success: true,
      cajaAbierta: !!cajaAbierta,
      data: cajaAbierta
    });
  } catch (error) {
    console.error('Error al verificar caja:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar caja',
      error: error.message
    });
  }
});

// Obtener caja actual
router.get('/actual', async (req, res) => {
  try {
    const usuarioId = req.body.usuario || (req.user && req.user._id);
    
    if (!usuarioId) {
      return res.status(400).json({
        success: false,
        message: '1111Se requiere ID de usuario'
      });
    }
    
    const caja = await Caja.findOne({
      usuario: usuarioId,
      estado: 'abierta'
    }).populate('usuario', 'nombre email');
    
    if (!caja) {
      return res.status(404).json({
        success: false,
        message: 'No tienes una caja abierta actualmente'
      });
    }
    
    res.json({
      success: true,
      data: caja
    });
  } catch (error) {
    console.error('Error al obtener caja actual:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener caja actual',
      error: error.message
    });
  }
});

// Obtener historial de cajas 
router.get('/historial', async (req, res) => {
  try {
    // Obtener el ID del usuario de la query
    const usuarioId = req.query.usuario; 

    if (!usuarioId) {
      return res.status(400).json({
        success: false,
        message: ' Se requiere ID de usuario para el historial'
      });
    }
    
    const cajas = await Caja.find({
      usuario: usuarioId
    }).sort({ 'apertura.fecha': -1 });
    
    res.json({
      success: true,
      data: cajas
    });
  } catch (error) {
    console.error('Error al obtener historial de cajas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial de cajas',
      error: error.message
    });
  }
});

// Abrir caja
router.post('/abrir', async (req, res) => {
  try {
    const { montoInicial, observaciones } = req.body;
    const usuarioId = req.query.usuario;
    
    if (!usuarioId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere ID de usuario'
      });
    }
    
    if (montoInicial === undefined || montoInicial === null) {
      return res.status(400).json({
        success: false,
        message: 'El monto inicial es requerido'
      });
    }
    
    // Verificar si ya hay una caja abierta
    const cajaAbierta = await Caja.findOne({
      usuario: usuarioId,
      estado: 'abierta'
    });

    if (cajaAbierta) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes una caja abierta',
        data: cajaAbierta
      });
    }

    // Crear nueva caja
    const caja = new Caja({
      usuario: usuarioId,
      apertura: {
        fecha: new Date(),
        monto: montoInicial,
        observaciones: observaciones || ''
      },
      ventas: [],
      resumen: {
        efectivo: { total: 0, cantidad: 0 },
        tarjeta: { total: 0, cantidad: 0 },
        transferencia: { total: 0, cantidad: 0 },
        totalGeneral: 0
      }
    });

    await caja.save();
    
    res.status(201).json({
      success: true,
      message: 'Caja abierta exitosamente',
      data: caja
    });
  } catch (error) {
    console.error('Error al abrir caja:', error);
    res.status(500).json({
      success: false,
      message: 'Error al abrir caja',
      error: error.message
    });
  }
});

// 2. RUTAS CON PARÁMETROS DESPUÉS
// Obtener ventas de una caja
router.get('/:id/ventas', async (req, res) => {
  try {
    const caja = await Caja.findById(req.params.id)
      .populate('ventas.pedido', 'numeroMesa total')
      .populate('ventas.cobro', 'metodoPago total');
    
    if (!caja) {
      return res.status(404).json({
        success: false,
        message: 'Caja no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: caja.ventas
    });
  } catch (error) {
    console.error('Error al obtener ventas de la caja:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ventas de la caja',
      error: error.message
    });
  }
});

 
// Cerrar caja
router.put('/cerrar/:id', async (req, res) => {
  try {
    const { montoCierre, observaciones } = req.body;
    
    // Validar datos
    if (typeof montoCierre !== 'number' || montoCierre < 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto de cierre debe ser un número positivo'
      });
    }
    
    // Buscar la caja
    const caja = await Caja.findById(req.params.id)
      .populate('usuario', 'nombre email')
      .populate('ventas.pedido')
      .populate('ventas.cobro');
    
    if (!caja) {
      return res.status(404).json({
        success: false,
        message: 'Caja no encontrada'
      });
    }
    
    // Verificar que la caja esté abierta
    if (caja.estado !== 'abierta') {
      return res.status(400).json({
        success: false,
        message: 'Esta caja ya está cerrada'
      });
    }
    
    // Calcular montos y diferencia
    let ventasEfectivo = 0;
    let totalVentas = 0;
    
    // Si hay ventas, calcularlas
    if (caja.ventas && caja.ventas.length > 0) {
      caja.ventas.forEach(venta => {
        if (venta.metodoPago === 'EFECTIVO') {
          ventasEfectivo += venta.monto;
        }
        totalVentas += venta.monto;
      });
    }
    
    // Calcular monto teórico y diferencia
    const montoTeorico = caja.apertura.monto + ventasEfectivo;
    const diferencia = montoCierre - montoTeorico;
    
    // Crear resumen para el cierre
    const resumen = {
      efectivo: {
        total: ventasEfectivo,
        cantidad: caja.ventas ? caja.ventas.filter(v => v.metodoPago === 'EFECTIVO').length : 0
      },
      tarjeta: {
        total: caja.ventas ? caja.ventas.filter(v => v.metodoPago === 'TARJETA').reduce((sum, v) => sum + v.monto, 0) : 0,
        cantidad: caja.ventas ? caja.ventas.filter(v => v.metodoPago === 'TARJETA').length : 0
      },
      transferencia: {
        total: caja.ventas ? caja.ventas.filter(v => v.metodoPago === 'TRANSFERENCIA').reduce((sum, v) => sum + v.monto, 0) : 0,
        cantidad: caja.ventas ? caja.ventas.filter(v => v.metodoPago === 'TRANSFERENCIA').length : 0
      },
      totalGeneral: totalVentas
    };
    
    // Actualizar la caja
    caja.cierre = {
      fecha: new Date(),
      monto: montoCierre,
      diferencia: diferencia,
      observaciones: observaciones || ''
    };
    
    caja.estado = 'cerrada';
    caja.resumen = resumen;
    
    // Guardar los cambios
    await caja.save();
    
    res.json({
      success: true,
      message: 'Caja cerrada correctamente',
      data: caja
    });
    
  } catch (error) {
    console.error('Error al cerrar caja:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cerrar caja',
      error: error.message
    });
  }
});

// Obtener caja por ID (DEBE IR AL FINAL)
router.get('/:id', async (req, res) => {
  try {
    const caja = await Caja.findById(req.params.id)
      .populate('usuario', 'nombre email')
      .populate('ventas.pedido')
      .populate('ventas.cobro');
    
    if (!caja) {
      return res.status(404).json({
        success: false,
        message: 'Caja no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: caja
    });
  } catch (error) {
    console.error('Error al obtener caja:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener caja',
      error: error.message
    });
  }
});

module.exports = router;