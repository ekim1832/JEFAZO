// Datos de prueba para la base de datos

// datos-prueba.js

// Productos
const productosPrueba = [
    {
      nombre: 'POLLO',
      categoria: 'COMIDA',
      tipoPrecio: 'MULTIPLE',
      precios: {
        precioMesa: 4.00,
        precioLlevar: 4.00,
        precioPorcion: 3.25,
        precioPorcionLlevar: 3.25
      },
      tiempoPreparacion: 15
    },
    {
      nombre: 'CARNE',
      categoria: 'COMIDA',
      tipoPrecio: 'MULTIPLE',
      precios: {
        precioMesa: 4.00,
        precioLlevar: 4.00,
        precioPorcion: 3.25,
        precioPorcionLlevar: 3.25
      },
      tiempoPreparacion: 20
    },
    {
      nombre: 'CHULETA',
      categoria: 'COMIDA',
      tipoPrecio: 'MULTIPLE',
      precios: {
        precioMesa: 4.00,
        precioLlevar: 4.00,
        precioPorcion: 3.25,
        precioPorcionLlevar: 3.25
      },
      tiempoPreparacion: 15
    },
    {
      nombre: 'COSTILLA',
      categoria: 'COMIDA',
      tipoPrecio: 'MULTIPLE',
      precios: {
        precioMesa: 4.50,
        precioLlevar: 4.50,
        precioPorcion: 3.75,
        precioPorcionLlevar: 3.75
      },
      tiempoPreparacion: 25
    },
    {
      nombre: 'COLA_PERSONAL',
      categoria: 'BEBIDAS',
      tipoPrecio: 'UNICO',
      precios: {
        precioUnico: 1.00
      },
      tiempoPreparacion: 1
    },
    {
      nombre: 'COLA_1.75',
      categoria: 'BEBIDAS',
      tipoPrecio: 'UNICO',
      precios: {
        precioUnico: 2.25
      },
      tiempoPreparacion: 1
    },
    {
      nombre: 'BANDEJA_PLASTICA',
      categoria: 'EXTRAS',
      tipoPrecio: 'UNICO',
      precios: {
        precioUnico: 0.25
      },
      tiempoPreparacion: 1
    }
  ];
  
  // Clientes
  const clientesPrueba = [
    {
      tipoCliente: 'CONSUMIDOR_FINAL',
      nombre: 'CONSUMIDOR FINAL'
    },
    {
      tipoCliente: 'REGISTRADO',
      nombre: 'Juan Pérez',
      identificacion: {
        tipo: 'CEDULA',
        numero: '1234567890'
      },
      direccion: {
        calle: 'Av. Principal 123',
        ciudad: 'Guayaquil',
        provincia: 'Guayas'
      },
      contacto: {
        telefono: '0987654321',
        email: 'juan.perez@email.com'
      }
    }
  ];
  
  // Pedidos
  const pedidosPrueba = [
    {
      numeroMesa: 1,
      mesero: 'ID_DEL_MESERO', // Reemplazar con ID real
      estado: 'PENDIENTE',
      items: [
        {
          producto: 'ID_DEL_POLLO', // Reemplazar con ID real
          cantidad: 1,
          esPorcion: false,
          paraLlevar: false,
          parrilla: {
            tipoCarne: 'POLLO',
            cantidad: 1,
            estado: 'PENDIENTE'
          },
          cocina: {
            tipo: 'ENSALADA',
            paraLlevar: false,
            tipoArroz: 'MORO',
            estado: 'PENDIENTE'
          },
          precioUnitario: 4.00,
          precioTotal: 4.00,
          tiempoEstimado: 15
        }
      ],
      metodoPago: 'EFECTIVO',
      cliente: 'ID_DEL_CONSUMIDOR_FINAL', // Reemplazar con ID real
      subtotal: 4.00,
      total: 4.00,
      tiempoPreparacionTotal: 15
    }
  ];
  
  // Script para insertar datos de prueba
  async function insertarDatosPrueba() {
    try {
      // Insertar productos
      const productos = await Producto.insertMany(productosPrueba);
      console.log('Productos insertados');
  
      // Insertar clientes
      const clientes = await Cliente.insertMany(clientesPrueba);
      console.log('Clientes insertados');
  
      // Actualizar IDs en pedidos de prueba
      pedidosPrueba[0].producto = productos[0]._id; // ID del pollo
      pedidosPrueba[0].cliente = clientes[0]._id; // ID del consumidor final
  
      // Insertar pedidos
      await Pedido.insertMany(pedidosPrueba);
      console.log('Pedidos insertados');
  
    } catch (error) {
      console.error('Error al insertar datos de prueba:', error);
    }
  }