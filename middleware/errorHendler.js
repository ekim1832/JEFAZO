// middlewares/errorHandler.js
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    
    const status = err.statusCode || 500;
    const message = err.message || 'Error interno del servidor';
    
    res.status(status).json({
      success: false,
      error: {
        message,
        status,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      }
    });
  };
  
  module.exports = errorHandler;