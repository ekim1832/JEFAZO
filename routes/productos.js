// routes/productos.js
const express = require('express');
const router = express.Router();
const Producto = require('../models/Producto');

// Obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const productos = await Producto.find().sort({ categoria: 1, nombre: 1 });
    res.json({
      success: true,
      data: productos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Obtener productos por categoría
router.get('/categoria/:categoria', async (req, res) => {
  try {
    const productos = await Producto.find({ 
      categoria: req.params.categoria.toUpperCase(),
      isActive: true 
    });
    res.json({
      success: true,
      data: productos
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Obtener producto por ID
router.get('/:id', async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    res.json({
      success: true,
      data: producto
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

//   POST (crear producto)
router.post('/', async (req, res) => {
  try {
    // Validamos que req.body.categoria sea un string antes de aplicar toUpperCase
    const categoria = typeof req.body.categoria === 'string' 
      ? req.body.categoria.toUpperCase() 
      : req.body.categoria;
      
    const productoData = {
      ...req.body,
      nombre: req.body.nombre.toUpperCase(),
      categoria: categoria
    };

    // El resto del código permanece igual
    // Validar precios según tipoPrecio
    if (productoData.tipoPrecio === 'UNICO' && !productoData.precios.precioUnico) {
      return res.status(400).json({
        success: false,
        message: 'El precio único es requerido para productos de tipo precio UNICO'
      });
    }

    if (productoData.tipoPrecio === 'MULTIPLE') {
      const preciosRequeridos = [
        'precioMesa',
        'precioLlevar',
        'precioPorcion',
        'precioPorcionLlevar'
      ];
      
      const faltanPrecios = preciosRequeridos.filter(
        precio => !productoData.precios[precio]
      );

      if (faltanPrecios.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Faltan los siguientes precios: ${faltanPrecios.join(', ')}`
        });
      }
    }

    const producto = new Producto(productoData);
    await producto.save();
    
    res.status(201).json({
      success: true,
      data: producto
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

//   PUT (actualizar producto)
router.put('/:id', async (req, res) => {
  try {
    // Validamos que req.body.categoria sea un string antes de aplicar toUpperCase
    const categoria = typeof req.body.categoria === 'string' 
      ? req.body.categoria.toUpperCase() 
      : req.body.categoria;
      
    const productoData = {
      ...req.body,
      updatedAt: new Date(),
      nombre: req.body.nombre.toUpperCase(),
      categoria: categoria
    };

    // El resto del código permanece igual
    // Validar precios según tipoPrecio
    if (productoData.tipoPrecio === 'UNICO' && !productoData.precios.precioUnico) {
      return res.status(400).json({
        success: false,
        message: 'El precio único es requerido para productos de tipo precio UNICO'
      });
    }

    if (productoData.tipoPrecio === 'MULTIPLE') {
      const preciosRequeridos = [
        'precioMesa',
        'precioLlevar',
        'precioPorcion',
        'precioPorcionLlevar'
      ];
      
      const faltanPrecios = preciosRequeridos.filter(
        precio => !productoData.precios[precio]
      );

      if (faltanPrecios.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Faltan los siguientes precios: ${faltanPrecios.join(', ')}`
        });
      }
    }

    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      productoData,
      { new: true, runValidators: true }
    );

    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      data: producto
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Toggle estado del producto (activo/inactivo)
router.patch('/:id/toggle-estado', async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    producto.isActive = !producto.isActive;
    producto.updatedAt = new Date();
    await producto.save();
    
    res.json({
      success: true,
      data: producto
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Eliminar producto
router.delete('/:id', async (req, res) => {
  try {
    const producto = await Producto.findByIdAndDelete(req.params.id);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    res.json({
      success: true,
      message: 'Producto eliminado correctamente'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;