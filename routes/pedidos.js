// routes/pedidos.js
const express = require('express');
const router = express.Router();
const { Pedido, Cliente } = require('../models');
  

// Crear nuevo pedido
router.post('/', async (req, res) => {
  try {
    // Si no se especifica cliente, usar consumidor final
    if (!req.body.cliente) {
      const consumidorFinal = await Cliente.obtenerConsumidorFinal();
      req.body.cliente = consumidorFinal._id;
    }

    const pedido = new Pedido({
      ...req.body,
      estado: 'PENDIENTE'
    });
    
    await pedido.save();
    
    const pedidoPopulado = await Pedido.findById(pedido._id)
      .populate('cliente')
      .populate('mesero');

    res.status(201).json({
      success: true,
      data: pedidoPopulado,
      message: 'Pedido creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear pedido:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Obtener todos los pedidos
router.get('/', async (req, res) => {
  try {
    const filtros = {};
    
    // Filtrar por mesero si se proporciona
    if (req.query.meseroId) {
      filtros.mesero = req.query.meseroId;
    }

    // Filtrar por estado si se proporciona
    if (req.query.estado) {
      filtros.estado = req.query.estado.toUpperCase();
    }

    const pedidos = await Pedido.find(filtros)
      .populate('cliente')
      .populate('mesero')
      .populate('items.producto') // Esto es lo nuevo
      .sort({ createdAt: -1 });

 // Transforma la respuesta para incluir nombreProducto
 const pedidosConNombres = pedidos.map(pedido => {
  const pedidoObj = pedido.toObject();
  
  // Añade nombreProducto a cada item basado en el producto populado
  pedidoObj.items = pedidoObj.items.map(item => {
    if (item.producto && typeof item.producto === 'object') {
      return {
        ...item,
        nombreProducto: item.producto.nombre,
        producto: item.producto._id // Mantén el ID para compatibilidad
      };
    }
    return item;
  });
  
  return pedidoObj;
});


    res.json({
      success: true,
      data: pedidos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Obtener pedidos por área (cocina o parrilla)
router.get('/area/:area', async (req, res) => {
  try {
    const area = req.params.area.toUpperCase();
    if (!['COCINA', 'PARRILLA'].includes(area)) {
      return res.status(400).json({
        success: false,
        message: 'Área inválida'
      });
    }

    const pedidos = await Pedido[`obtenerPedidos${area}`]();
    res.json({
      success: true,
      data: pedidos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Obtener pedido específico
router.get('/:id', async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id)
      .populate('cliente')
      .populate('mesero') 
      .populate('items.producto');

    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

      // Transforma la respuesta para incluir nombreProducto
      const pedidoObj = pedido.toObject();
      pedidoObj.items = pedidoObj.items.map(item => {
        if (item.producto && typeof item.producto === 'object') {
          return {
            ...item,
            nombreProducto: item.producto.nombre,
            producto: item.producto._id
          };
        }
        return item;
      });
  
    res.json({
      success: true,
      data: pedido
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}); 

// Actualizar estado de item específico
router.patch('/:id/items/:itemId/estado', async (req, res) => {
  try {
    const { estado, area, razon } = req.body;
    const itemIndex = parseInt(req.params.itemId); // Interpretar como índice si es numérico
    
    if (!estado) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el estado del item'
      });
    }

    const areaEfectiva = area || "general";

    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    // Verificar si es un índice válido
    if (!isNaN(itemIndex) && itemIndex >= 0 && itemIndex < pedido.items.length) {
      // Usar directamente el índice
      pedido.items[itemIndex].estadoitem = estado;
      if (razon) {
        pedido.items[itemIndex].razonCancelacion = razon;
      }
      await pedido.save();
    } else {
      // Intentar como ID si no es un índice válido
      const itemId = req.params.itemId;
      const item = pedido.items.find(i => i._id.toString() === itemId);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item no encontrado en el pedido'
        });
      }
      
      item.estadoitem = estado;
      if (razon) {
        item.razonCancelacion = razon;
      }
      await pedido.save();
    }
    
    const pedidoActualizado = await Pedido.findById(pedido._id)
      .populate('cliente')
      .populate('mesero');

    // Notificar actualización
    req.app.get('io').to(areaEfectiva.toLowerCase()).emit('item-actualizado', {
      pedidoId: pedido._id,
      itemId: req.params.itemId,
      estado: estado,
      pedidoCompleto: pedidoActualizado
    });

    res.json({
      success: true,
      data: pedidoActualizado
    });
  } catch (error) {
    console.error('Error en updateItemEstado:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}); 

// Marcar pedido como completado
router.patch('/:id/completar', async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    await pedido.marcarCompletado();
    
    // Notificar cambio de estado
    req.app.get('io').emit('pedido-completado', {
      pedidoId: pedido._id
    });

    res.json({
      success: true,
      data: pedido
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Agregar items a un pedido existente
router.patch('/:id/items', async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    // Validar que el pedido no esté completado o cancelado
    if (['COMPLETADO', 'CANCELADO' ].includes(pedido.estado)) {
      return res.status(400).json({
        success: false,
        message: `No se pueden agregar items a un pedido en estado ${pedido.estado}`
      });
    }

    pedido.items.push(...req.body.items);
    await pedido.save();

    const pedidoActualizado = await Pedido.findById(pedido._id)
      .populate('cliente')
      .populate('mesero');

    // Notificar a las áreas correspondientes
    const nuevosItemsCocina = req.body.items.filter(item => item.cocina);
    const nuevosItemsParrilla = req.body.items.filter(item => item.parrilla);

    if (nuevosItemsCocina.length > 0) {
      req.app.get('io').to('cocina').emit('items-agregados', {
        pedidoId: pedido._id,
        items: nuevosItemsCocina
      });
    }

    if (nuevosItemsParrilla.length > 0) {
      req.app.get('io').to('parrilla').emit('items-agregados', {
        pedidoId: pedido._id,
        items: nuevosItemsParrilla
      });
    }

    res.json({
      success: true,
      data: pedidoActualizado
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Cancelar pedido
router.patch('/:id/cancelar', async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    await pedido.cancelar(req.body.motivo);
    
    // Notificar cancelación
    req.app.get('io').emit('pedido-cancelado', {
      pedidoId: pedido._id,
      motivo: req.body.motivo
    });

    res.json({
      success: true,
      data: pedido
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// pasar a estado Pendiente pedido
router.patch('/:id/pendiente', async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    await pedido.marcarPendiente(); 
    
    // Notificar entrega
    req.app.get('io').emit('pedido-pendiente', {
      pedidoId: pedido._id
    });

    res.json({
      success: true,
      data: pedido
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Marcar pedido como entregado
router.patch('/:id/entregar', async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    await pedido.marcarEntregado();
    
    // Notificar entrega
    req.app.get('io').emit('pedido-entregado', {
      pedidoId: pedido._id
    });

    res.json({
      success: true,
      data: pedido
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Eliminar pedido
router.delete('/:id', async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    if (!['PENDIENTE', 'CANCELADO'].includes(pedido.estado)) {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden eliminar pedidos pendientes o cancelados'
      });
    }

    await Pedido.findByIdAndDelete(req.params.id);
    
    // Notificar eliminación
    req.app.get('io').emit('pedido-eliminado', {
      pedidoId: req.params.id
    });

    res.json({
      success: true,
      message: 'Pedido eliminado correctamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;