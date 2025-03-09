// routes/cobros.js
const express = require('express');
const router = express.Router();
const { Cobro, Pedido, Cliente, Caja } = require('../models');

// Obtener todos los cobros
router.get('/', async (req, res) => {
  try {
    const cobros = await Cobro.find()
      .populate('pedido')
      .populate('cliente')
      .populate('cajero')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: cobros
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Obtener un cobro específico
router.get('/:id', async (req, res) => {
  try {
    const cobro = await Cobro.findById(req.params.id)
      .populate('pedido')
      .populate('cliente')
      .populate('cajero');
    
    if (!cobro) {
      return res.status(404).json({
        success: false,
        message: 'Cobro no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: cobro
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Obtener todos los cobros de un pedido
router.get('/pedido/:pedidoId', async (req, res) => {
  try {
    const cobros = await Cobro.find({
      pedido: req.params.pedidoId,
      estado: 'COMPLETADO'
    })
      .populate('cliente')
      .populate('cajero')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: cobros
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/pedido/:pedidoId/verificar', async (req, res) => {
  try {
    // Verificar que el modelo Cobro y su método estático existen
    if (!Cobro || typeof Cobro.verificarPedidoCobrado !== 'function') {
      console.error('Error: Método verificarPedidoCobrado no disponible', { 
        modeloExiste: !!Cobro,
        metodoExiste: Cobro ? typeof Cobro.verificarPedidoCobrado : 'N/A'
      });
      
      return res.status(500).json({
        success: false,
        message: 'Error interno: método verificarPedidoCobrado no disponible'
      });
    }
    
    const pedidoId = req.params.pedidoId;
 //   console.log(`Verificando estado de cobro para pedido: ${pedidoId}`);
    
    const resultado = await Cobro.verificarPedidoCobrado(pedidoId);
    //console.log('Resultado verificación:', resultado);
    
    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('Error en /pedido/:pedidoId/verificar:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al verificar estado de cobro'
    });
  }
});

// Registrar un nuevo cobro
router.post('/', async (req, res) => {
  try {
  // Extraer datos del request
  const { pedido: pedidoId, metodoPago, total, /* otros campos */ } = req.body;
  const cajeroId = req.body.cajero || (req.user && req.user._id);
 

    // Verificar que vengan los datos necesarios
    if (!req.body.pedido || !req.body.metodoPago || !req.body.itemsCobrados || !req.body.cajero) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos para el cobro'
      });
    }
 
    // Verificar que el pedido exista
    const pedido = await Pedido.findById(pedidoId);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }
    
    // Verificar que el cliente exista o usar consumidor final
    let cliente = req.body.cliente;
    if (!cliente) {
      const consumidorFinal = await Cliente.obtenerConsumidorFinal();
      cliente = consumidorFinal._id;
    }
    
   
    // Verificar si hay una caja abierta para el cajero
    const cajaAbierta = await Caja.findOne({
      usuario: req.body.cajero,
      estado: 'abierta'
    });
   
    if (!cajaAbierta) {
      return res.status(400).json({
        success: false,
        message: 'No hay una caja abierta para este cajero'
      });
    }
   
    // Determinar si es cobro completo o parcial
    const estadoCobro = await Cobro.verificarPedidoCobrado(req.body.pedido);
 
    // Si después de este cobro el pedido quedará completamente cobrado, es COMPLETO
    const tipoCobro = req.body.tipoCobro || 
      (estadoCobro.itemsFaltantes.length === req.body.itemsCobrados.length ? 'COMPLETO' : 'PARCIAL');
      
    // Crear el nuevo cobro
    const nuevoCobro = new Cobro({
      pedido: req.body.pedido,
      tipoCobro,
      itemsCobrados: req.body.itemsCobrados,
      subtotal: req.body.subtotal,
      iva: req.body.iva || 0,
      total: req.body.total,
      metodoPago: req.body.metodoPago,
      cliente,
      facturado: req.body.facturado || false,
      cajero: req.body.cajero,
      observaciones: req.body.observaciones || '',
      caja: cajaAbierta._id
    }); 
    await nuevoCobro.save();
 
 
    // Registrar la venta en la caja
    cajaAbierta.ventas.push({
      pedido: pedido._id,
      cobro: nuevoCobro._id,  // Agrega el ID del cobro
      monto: nuevoCobro.total,
      metodoPago: req.body.metodoPago  // Este es el campo que falta
    });
    
    await cajaAbierta.save();
    
    // Si el cobro es COMPLETO, marcar el pedido como COMPLETADO
    if (tipoCobro === 'COMPLETO' || 
        (await Cobro.verificarPedidoCobrado(req.body.pedido)).cobrado) {
      pedido.estado = 'COMPLETADO';
      pedido.completadoAt = new Date();
      await pedido.save();
    }
    
    res.status(201).json({
      success: true,
      data: nuevoCobro,
      caja: cajaAbierta,
      estadoPedido: pedido.estado
    });
  } catch (error) {
    console.error('Error al registrar cobro:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Anular un cobro
router.patch('/:id/anular', async (req, res) => {
  try {
    const cobro = await Cobro.findById(req.params.id);
    
    if (!cobro) {
      return res.status(404).json({
        success: false,
        message: 'Cobro no encontrado'
      });
    }
    
    if (cobro.estado === 'ANULADO') {
      return res.status(400).json({
        success: false,
        message: 'Este cobro ya ha sido anulado'
      });
    }
    
    // Anular el cobro
    await cobro.anular(req.body.motivo);
    
    // Quitar el monto de la caja
    if (cobro.caja) {
      const caja = await Caja.findById(cobro.caja);
      if (caja && caja.estado === 'abierta') {
        // Filtrar la venta correspondiente
        caja.ventas = caja.ventas.filter(venta => 
          venta.pedido.toString() !== cobro.pedido.toString() || 
          venta.monto !== cobro.total
        );
        
        await caja.save();
      }
    }
    
    // Si el pedido estaba COMPLETADO, volver a ENTREGADO
    const pedido = await Pedido.findById(cobro.pedido);
    if (pedido && pedido.estado === 'COMPLETADO') {
      const estadoCobro = await Cobro.verificarPedidoCobrado(cobro.pedido);
      if (!estadoCobro.cobrado) {
        pedido.estado = 'ENTREGADO';
        await pedido.save();
      }
    }
    
    res.json({
      success: true,
      data: cobro,
      message: 'Cobro anulado correctamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});



// Emitir factura para un cobro
router.patch('/:id/facturar', async (req, res) => {
  try {
    const cobro = await Cobro.findById(req.params.id);
    
    if (!cobro) {
      return res.status(404).json({
        success: false,
        message: 'Cobro no encontrado'
      });
    }
    
    if (cobro.facturado) {
      return res.status(400).json({
        success: false,
        message: 'Este cobro ya ha sido facturado'
      });
    }
    
    if (!req.body.numeroFactura) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el número de factura'
      });
    }
    
    // Actualizar datos de factura
    cobro.facturado = true;
    cobro.datosFactura = {
      numeroFactura: req.body.numeroFactura,
      fecha: new Date()
    };
    
    await cobro.save();
    
    res.json({
      success: true,
      data: cobro,
      message: 'Factura emitida correctamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;