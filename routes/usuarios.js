const express = require('express');
const router = express.Router();
const { Usuario } = require('../models');
const bcrypt = require('bcryptjs');  

// Obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    res.json({
      success: true,
      data: usuarios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Crear usuario
 // routes/usuarios.js
router.post('/', async (req, res) => {
  try {
    // Validar que vengan todos los campos requeridos
    const { nombre, apellido, usuario, password, rol } = req.body;
    
    if (!nombre || !apellido || !usuario || !password || !rol) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    // Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({ usuario });
    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario ya está en uso'
      });
    }

    // Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordEncriptado = await bcrypt.hash(password, salt);

    // Crear el nuevo usuario
    const nuevoUsuario = new Usuario({
      nombre,
      apellido,
      usuario,
      password: passwordEncriptado,
      rol,
      activo: true
    });

    await nuevoUsuario.save();
    
    // No devolver el password en la respuesta
    const usuarioResponse = nuevoUsuario.toObject();
    delete usuarioResponse.password;

    res.status(201).json({
      success: true,
      data: usuarioResponse
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al crear el usuario'
    });
  }
});

// Actualizar usuario
router.put('/:id', async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    let update = { ...updateData };

    // Si se proporciona una nueva contraseña, encriptarla
    if (password) {
      const salt = await bcrypt.genSalt(10);
      update.password = await bcrypt.hash(password, salt);
    }

    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id, 
      update,
      { new: true }
    );

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No devolver el password en la respuesta
    const usuarioResponse = usuario.toObject();
    delete usuarioResponse.password;

    res.json({
      success: true,
      data: usuarioResponse
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Obtener usuario por ID
router.get('/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const usuarioResponse = usuario.toObject();
    delete usuarioResponse.password;

    res.json({
      success: true,
      data: usuarioResponse
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Toggle estado de usuario
router.put('/:id/toggle-estado', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    usuario.activo = !usuario.activo;
    await usuario.save();
    res.json({
      success: true,
      data: usuario
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;