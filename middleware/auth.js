const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    
    if (!token) {
      throw new AppError('No autorizado - Token no proporcionado', 401);
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);

    if (!usuario) {
      throw new AppError('No autorizado - Usuario no encontrado', 401);
    }

    if (!usuario.activo) {
      throw new AppError('Usuario desactivado', 401);
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    next(new AppError('Por favor autentíquese correctamente', 401));
  }
};

// Middleware para verificar roles
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: 'No tiene permiso para realizar esta acción' });
    }
    next();
  };
};

module.exports = { auth, checkRole };