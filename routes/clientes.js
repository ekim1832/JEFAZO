// routes/clientes.js
const express = require('express');
const router = express.Router();
const Cliente = require('../models/Cliente');

// Obtener todos los clientes
router.get('/', async (req, res) => {
  try {
    const clientes = await Cliente.find({ isActive: true })
      .sort({ nombre: 1 });
    
    res.json({
      success: true,
      data: clientes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    res.json({
      success: true,
      data: cliente
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Buscar cliente por identificación
router.get('/buscar/:tipo/:numero', async (req, res) => {
  try {
    const cliente = await Cliente.buscarPorIdentificacion(
      req.params.tipo.toUpperCase(),
      req.params.numero
    );
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: cliente
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Crear nuevo cliente
router.post('/', async (req, res) => {
  try {
    // Validar si ya existe un cliente con la misma identificación
    if (req.body.tipoCliente === 'REGISTRADO') {
      const clienteExistente = await Cliente.buscarPorIdentificacion(
        req.body.identificacion.tipo,
        req.body.identificacion.numero
      );
      
      if (clienteExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un cliente con esta identificación'
        });
      }
    }
    
    const cliente = new Cliente(req.body);
    await cliente.save();
    
    res.status(201).json({
      success: true,
      data: cliente
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Actualizar cliente
router.put('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: cliente
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Desactivar cliente
router.delete('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      { 
        isActive: false,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Cliente desactivado correctamente'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;    