const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

router.get('/status', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor funcionando correctamente' });
});


// Registro de usuario
router.post('/register', async (req, res) => {
  try {
    // Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({ usuario: req.body.usuario });
    if (usuarioExistente) {
      return res.status(400).json({ mensaje: 'El usuario ya existe' });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordEncriptado = await bcrypt.hash(req.body.password, salt);

    // Crear nuevo usuario
    const usuario = new Usuario({
      nombre: req.body.nombre,
      apellido: req.body.apellido,
      usuario: req.body.usuario,
      password: passwordEncriptado,
      rol: req.body.rol
    });

    const nuevoUsuario = await usuario.save();
    
    // No enviar la contraseña en la respuesta
    const usuarioResponse = nuevoUsuario.toObject();
    delete usuarioResponse.password;
    
    res.status(201).json(usuarioResponse);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
});


// Login
router.post('/login', async (req, res) => {
  try {
      // Buscar usuario
      const usuario = await Usuario.findOne({ usuario: req.body.usuario });
      if (!usuario) {
          return res.status(400).json({ mensaje: 'Usuario o contraseña incorrectos' });
      }

      // Verificar contraseña
      const passwordValido = await bcrypt.compare(req.body.password, usuario.password);
      if (!passwordValido) {
          return res.status(400).json({ mensaje: 'Usuario o contraseña incorrectos' });
      }

      // Verificar si el usuario está activo
      if (!usuario.activo) {
          return res.status(400).json({ mensaje: 'Usuario desactivado' });
      }

      // Generar token
      const token = jwt.sign(
          { 
              id: usuario._id, 
              rol: usuario.rol,
              nombre: usuario.nombre,
              apellido: usuario.apellido
          },
          process.env.JWT_SECRET, // Esto debería estar en variables de entorno
          { expiresIn: '8h' }
      );

      // Respuesta exitosa
      res.json({
          token,
          usuario: {
              id: usuario._id,
              nombre: usuario.nombre,
              apellido: usuario.apellido,
              usuario: usuario.usuario,
              rol: usuario.rol
          }
      });

  } catch (error) {
      res.status(500).json({ mensaje: error.message });
  }
});

module.exports = router;