// routes/categorias.js
const express = require('express');
const router = express.Router();
const Categoria = require('../models/Categoria');

// Obtener todas las categorías
router.get('/', async (req, res) => {
  try {
    const categorias = await Categoria.find().sort({ nombre: 1 });
    res.json({
      success: true,
      data: categorias
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Obtener una categoría por ID
router.get('/:id', async (req, res) => {
  try {
    const categoria = await Categoria.findById(req.params.id);
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    res.json({
      success: true,
      data: categoria
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Crear nueva categoría
router.post('/', async (req, res) => {
  try {
    const categoriaData = {
      ...req.body,
      nombre: req.body.nombre.toUpperCase()
    };

    const categoria = new Categoria(categoriaData);
    await categoria.save();
    
    res.status(201).json({
      success: true,
      data: categoria
    });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Actualizar categoría
router.put('/:id', async (req, res) => {
  try {
    const categoriaData = {
      ...req.body,
      nombre: req.body.nombre?.toUpperCase(),
      updatedAt: new Date()
    };

    const categoria = await Categoria.findByIdAndUpdate(
      req.params.id,
      categoriaData,
      { new: true, runValidators: true }
    );

    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    res.json({
      success: true,
      data: categoria
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Toggle estado de la categoría (activa/inactiva)
router.patch('/:id/toggle-estado', async (req, res) => {
  try {
    const categoria = await Categoria.findById(req.params.id);
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    categoria.isActive = !categoria.isActive;
    categoria.updatedAt = new Date();
    await categoria.save();
    
    res.json({
      success: true,
      data: categoria
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Eliminar categoría
router.delete('/:id', async (req, res) => {
  try {
    const categoria = await Categoria.findByIdAndDelete(req.params.id);
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    res.json({
      success: true,
      message: 'Categoría eliminada correctamente'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;