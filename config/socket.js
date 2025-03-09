// config/socket.js
const socketConfig = (io) => {
    io.on('connection', (socket) => {
      console.log('Cliente conectado:', socket.id);
  
      socket.on('join-kitchen', () => {
        socket.join('cocina');
        socket.emit('joined', { room: 'cocina' });
      });
  
      socket.on('join-grill', () => {
        socket.join('parrilla');
        socket.emit('joined', { room: 'parrilla' });
      });
  
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
  
      socket.on('disconnect', (reason) => {
        console.log(`Cliente desconectado (${reason}):`, socket.id);
      });
    });
  
    io.on('error', (error) => {
      console.error('Socket.IO error:', error);
    });
  };