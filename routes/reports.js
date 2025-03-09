// routes/reports.js
const express = require('express');
const router = express.Router();
const Pedido = require('../models/Pedido');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');

// Ruta para reporte de ventas
router.get('/ventas', async (req, res) => {
  try {
    // Obtener fecha de inicio y fin para filtros
    const ahora = new Date();
    const inicioDelDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const finDelDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);
    
    const inicioSemana = new Date(ahora);
    inicioSemana.setDate(ahora.getDate() - ahora.getDay());
    
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    
    // Consulta para ventas del día
    const ventasHoy = await Pedido.aggregate([
      { $match: { 
        createdAt: { $gte: inicioDelDia, $lt: finDelDia },
        estado: 'COMPLETADO'
      }},
      { $group: { _id: null, total: { $sum: '$total' }, cantidad: { $sum: 1 } }}
    ]);
    
    // Consulta para ventas de la semana
    const ventasSemana = await Pedido.aggregate([
      { $match: { 
        createdAt: { $gte: inicioSemana, $lt: ahora },
        estado: 'COMPLETADO'
      }},
      { $group: { _id: null, total: { $sum: '$total' }, cantidad: { $sum: 1 } }}
    ]);
    
    // Consulta para ventas del mes
    const ventasMes = await Pedido.aggregate([
      { $match: { 
        createdAt: { $gte: inicioMes, $lt: ahora },
        estado: 'COMPLETADO'
      }},
      { $group: { _id: null, total: { $sum: '$total' }, cantidad: { $sum: 1 } }}
    ]);
    
    // Consulta para mejores clientes
    const topClientes = await Pedido.aggregate([
      { $match: { estado: 'COMPLETADO' }},
      { $group: { _id: '$cliente', total: { $sum: '$total' }}},
      { $sort: { total: -1 }},
      { $limit: 5 },
      { $lookup: { 
        from: 'clientes', 
        localField: '_id', 
        foreignField: '_id', 
        as: 'clienteInfo' 
      }},
      { $project: { 
        nombre: { $ifNull: [{ $arrayElemAt: ['$clienteInfo.nombre', 0] }, 'CONSUMIDOR FINAL'] },
        total: 1
      }}
    ]);
    
    // Consulta para ventas por hora
    const ventasPorHora = await Pedido.aggregate([
      { $match: { 
        createdAt: { $gte: inicioDelDia, $lt: finDelDia },
        estado: 'COMPLETADO'
      }},
      { $project: { 
        hora: { $hour: '$createdAt' },
        total: '$total'
      }},
      { $group: { 
        _id: '$hora', 
        total: { $sum: '$total' }
      }},
      { $sort: { _id: 1 }},
      { $project: { 
        _id: 0,
        hora: { 
          $concat: [
            { $toString: '$_id' }, 
            '-', 
            { $toString: { $add: ['$_id', 1] }}
          ] 
        },
        total: 1
      }}
    ]);
    
    res.json({
      success: true,
      data: {
        hoy: ventasHoy.length > 0 ? ventasHoy[0] : { total: 0, cantidad: 0 },
        semana: ventasSemana.length > 0 ? ventasSemana[0] : { total: 0, cantidad: 0 },
        mes: ventasMes.length > 0 ? ventasMes[0] : { total: 0, cantidad: 0 },
        topClientes,
        ventasPorHora
      }
    });
  } catch (error) {
    console.error('Error en reporte de ventas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte de ventas',
      error: error.message
    });
  }
});

// Ruta para reporte de productos
router.get('/productos', async (req, res) => {
  try {
    // Consulta para productos más vendidos
    const masVendidos = await Pedido.aggregate([
      { $match: { estado: 'COMPLETADO' }},
      { $unwind: '$items' },
      { $group: { 
        _id: '$items.producto', 
        cantidad: { $sum: '$items.cantidad' },
        total: { $sum: '$items.precioTotal' }
      }},
      { $sort: { cantidad: -1 }},
      { $limit: 5 },
      { $lookup: { 
        from: 'productos', 
        localField: '_id', 
        foreignField: '_id', 
        as: 'productoInfo' 
      }},
      { $project: { 
        _id: 0,
        nombre: { $arrayElemAt: ['$productoInfo.nombre', 0] },
        cantidad: 1,
        total: 1
      }}
    ]);
    
    // Consulta para productos menos vendidos
    const menosVendidos = await Pedido.aggregate([
      { $match: { estado: 'COMPLETADO' }},
      { $unwind: '$items' },
      { $group: { 
        _id: '$items.producto', 
        cantidad: { $sum: '$items.cantidad' },
        total: { $sum: '$items.precioTotal' }
      }},
      { $sort: { cantidad: 1 }},
      { $limit: 5 },
      { $lookup: { 
        from: 'productos', 
        localField: '_id', 
        foreignField: '_id', 
        as: 'productoInfo' 
      }},
      { $project: { 
        _id: 0,
        nombre: { $arrayElemAt: ['$productoInfo.nombre', 0] },
        cantidad: 1,
        total: 1
      }}
    ]);
    
    // Productos sin stock (si tienes un campo de stock)
    const sinStock = await Producto.aggregate([
      { $match: { stock: { $lte: 0 }, isActive: true }},
      { $project: {
        _id: 0,
        nombre: 1,
        diasSinStock: {
          $divide: [
            { $subtract: [new Date(), '$lastStockUpdate'] },
            1000 * 60 * 60 * 24 // Convertir milisegundos a días
          ]
        }
      }},
      { $project: {
        nombre: 1,
        diasSinStock: { $ceil: '$diasSinStock' }
      }}
    ]);
    
    res.json({
      success: true,
      data: {
        masVendidos,
        menosVendidos,
        sinStock
      }
    });
  } catch (error) {
    console.error('Error en reporte de productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte de productos',
      error: error.message
    });
  }
});

// Ruta para reporte de pedidos
router.get('/pedidos', async (req, res) => {
  try {
    // Contar pedidos por estado
    const completados = await Pedido.countDocuments({ estado: 'COMPLETADO' });
    const pendientes = await Pedido.countDocuments({ estado: 'PENDIENTE' });
    const cancelados = await Pedido.countDocuments({ estado: 'CANCELADO' });
    
    // Calcular tiempo promedio de preparación
    const tiempoPromedio = await Pedido.aggregate([
      { $match: { estado: 'COMPLETADO' }},
      { $project: {
        // Ajusta estos campos según tu estructura
        tiempoPreparacion: {
          $cond: {
            if: { $and: [
              { $isArray: "$updatedAt" },
              { $isArray: "$createdAt" }
            ]},
            then: { $divide: [
              { $subtract: ['$updatedAt', '$createdAt'] },
              1000 * 60 // Convertir milisegundos a minutos
            ]},
            else: 15 // Valor por defecto si no hay fechas
          }
        }
      }},
      { $match: { tiempoPreparacion: { $gt: 0, $lt: 300 } }}, // Filtrar valores anómalos
      { $group: {
        _id: null,
        promedio: { $avg: '$tiempoPreparacion' }
      }}
    ]);
    
    res.json({
      success: true,
      data: {
        completados,
        pendientes,
        cancelados,
        tiempoPromedio: tiempoPromedio.length > 0 ? tiempoPromedio[0].promedio : 0
      }
    });
  } catch (error) {
    console.error('Error en reporte de pedidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte de pedidos',
      error: error.message
    });
  }
});

 
// Endpoint para exportar reportes
router.get('/export/:tipo', async (req, res) => {
  try {
    const { tipo } = req.params;
    const formato = req.query.formato || 'pdf';
    
    if (!['ventas', 'productos', 'pedidos'].includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de reporte no válido'
      });
    }
    
    if (!['pdf', 'excel'].includes(formato)) {
      return res.status(400).json({
        success: false,
        message: 'Formato no válido'
      });
    }
    
    // Obtener datos para el reporte
    let reportData;
    switch (tipo) {
      case 'ventas':
        reportData = await generarDatosReporteVentas();
        break;
      case 'productos':
        reportData = await generarDatosReporteProductos();
        break;
      case 'pedidos':
        reportData = await generarDatosReportePedidos();
        break;
    }
    
    // Generar el archivo según el formato
    let filePath;
    if (formato === 'pdf') {
      filePath = await generarPDF(tipo, reportData);
    } else {
      filePath = await generarExcel(tipo, reportData);
    }
    
    // Crear URL para acceder al archivo
    const fileName = filePath.split('/').pop();
    const fileUrl = `${req.protocol}://${req.get('host')}/reports/${fileName}`;
    
    res.json({
      success: true,
      data: fileUrl
    });
  } catch (error) {
    console.error(`Error exportando reporte:`, error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar reporte',
      error: error.message
    });
  }
});

// Funciones auxiliares para generar los datos de reportes
// Función corregida para generarDatosReporteVentas
async function generarDatosReporteVentas() {
  try {
    // Obtener fecha de inicio y fin para filtros
    const ahora = new Date();
    const inicioDelDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const finDelDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);
    
    const inicioSemana = new Date(ahora);
    inicioSemana.setDate(ahora.getDate() - ahora.getDay());
    
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    
    // Consulta para ventas del día
    const ventasHoy = await Pedido.aggregate([
      { $match: { 
        createdAt: { $gte: inicioDelDia, $lt: finDelDia },
        estado: 'COMPLETADO'
      }},
      { $group: { _id: null, total: { $sum: '$total' }, cantidad: { $sum: 1 } }}
    ]);
    
    // Consulta para ventas de la semana
    const ventasSemana = await Pedido.aggregate([
      { $match: { 
        createdAt: { $gte: inicioSemana, $lt: ahora },
        estado: 'COMPLETADO'
      }},
      { $group: { _id: null, total: { $sum: '$total' }, cantidad: { $sum: 1 } }}
    ]);
    
    // Consulta para ventas del mes
    const ventasMes = await Pedido.aggregate([
      { $match: { 
        createdAt: { $gte: inicioMes, $lt: ahora },
        estado: 'COMPLETADO'
      }},
      { $group: { _id: null, total: { $sum: '$total' }, cantidad: { $sum: 1 } }}
    ]);
    
    // Consulta para mejores clientes
    const topClientes = await Pedido.aggregate([
      { $match: { estado: 'COMPLETADO' }},
      { $group: { _id: '$cliente', total: { $sum: '$total' }}},
      { $sort: { total: -1 }},
      { $limit: 5 },
      { $lookup: { 
        from: 'clientes', 
        localField: '_id', 
        foreignField: '_id', 
        as: 'clienteInfo' 
      }},
      { $project: { 
        nombre: { $ifNull: [{ $arrayElemAt: ['$clienteInfo.nombre', 0] }, 'CONSUMIDOR FINAL'] },
        total: 1
      }}
    ]);
    
    // Consulta para ventas por hora
    const ventasPorHora = await Pedido.aggregate([
      { $match: { 
        createdAt: { $gte: inicioDelDia, $lt: finDelDia },
        estado: 'COMPLETADO'
      }},
      { $project: { 
        hora: { $hour: '$createdAt' },
        total: '$total'
      }},
      { $group: { 
        _id: '$hora', 
        total: { $sum: '$total' }
      }},
      { $sort: { _id: 1 }},
      { $project: { 
        _id: 0,
        hora: { 
          $concat: [
            { $toString: '$_id' }, 
            '-', 
            { $toString: { $add: ['$_id', 1] }}
          ] 
        },
        total: 1
      }}
    ]);
    
    // Crear y devolver el objeto de datos del reporte
    return {
      hoy: ventasHoy.length > 0 ? ventasHoy[0] : { total: 0, cantidad: 0 },
      semana: ventasSemana.length > 0 ? ventasSemana[0] : { total: 0, cantidad: 0 },
      mes: ventasMes.length > 0 ? ventasMes[0] : { total: 0, cantidad: 0 },
      topClientes,
      ventasPorHora
    };
  } catch (error) {
    console.error('Error generando datos del reporte de ventas:', error);
    throw error;
  }
}

async function generarDatosReporteProductos() {
  try {
    // Consulta para productos más vendidos
    const masVendidos = await Pedido.aggregate([
      { $match: { estado: 'COMPLETADO' }},
      { $unwind: '$items' },
      { $group: { 
        _id: '$items.producto', 
        cantidad: { $sum: '$items.cantidad' },
        total: { $sum: '$items.precioTotal' }
      }},
      { $sort: { cantidad: -1 }},
      { $limit: 5 },
      { $lookup: { 
        from: 'productos', 
        localField: '_id', 
        foreignField: '_id', 
        as: 'productoInfo' 
      }},
      { $project: { 
        _id: 0,
        nombre: { $arrayElemAt: ['$productoInfo.nombre', 0] },
        cantidad: 1,
        total: 1
      }}
    ]);
    
    // Consulta para productos menos vendidos
    const menosVendidos = await Pedido.aggregate([
      { $match: { estado: 'COMPLETADO' }},
      { $unwind: '$items' },
      { $group: { 
        _id: '$items.producto', 
        cantidad: { $sum: '$items.cantidad' },
        total: { $sum: '$items.precioTotal' }
      }},
      { $sort: { cantidad: 1 }},
      { $limit: 5 },
      { $lookup: { 
        from: 'productos', 
        localField: '_id', 
        foreignField: '_id', 
        as: 'productoInfo' 
      }},
      { $project: { 
        _id: 0,
        nombre: { $arrayElemAt: ['$productoInfo.nombre', 0] },
        cantidad: 1,
        total: 1
      }}
    ]);
    
    // Productos sin stock - ajusta esto según tu modelo
    const sinStock = await Producto.find({ isActive: true })
      .sort({ stock: 1 })
      .limit(5)
      .select('nombre updatedAt')
      .lean();
      
    const sinStockFormatted = sinStock.map(producto => ({
      nombre: producto.nombre,
      diasSinStock: Math.ceil((new Date() - new Date(producto.updatedAt)) / (1000 * 60 * 60 * 24))
    }));
    
    return {
      masVendidos,
      menosVendidos,
      sinStock: sinStockFormatted
    };
  } catch (error) {
    console.error('Error generando datos del reporte de productos:', error);
    throw error;
  }
}

async function generarDatosReportePedidos() {
  try {
    // Contar pedidos por estado
    const completados = await Pedido.countDocuments({ estado: 'COMPLETADO' });
    const pendientes = await Pedido.countDocuments({ estado: 'PENDIENTE' });
    const cancelados = await Pedido.countDocuments({ estado: 'CANCELADO' });
    
    // Calcular tiempo promedio - ajusta esto según tu modelo
    const pedidosCompletados = await Pedido.find({ 
      estado: 'COMPLETADO',
      createdAt: { $exists: true },
      updatedAt: { $exists: true }
    }).select('createdAt updatedAt').lean();
    
    let tiempoTotal = 0;
    let conteo = 0;
    
    pedidosCompletados.forEach(pedido => {
      const tiempoMs = new Date(pedido.updatedAt) - new Date(pedido.createdAt);
      if (tiempoMs > 0) {
        tiempoTotal += tiempoMs;
        conteo++;
      }
    });
    
    const tiempoPromedioMinutos = conteo > 0 ? Math.ceil(tiempoTotal / conteo / 1000 / 60) : 0;
    
    return {
      completados,
      pendientes,
      cancelados,
      tiempoPromedio: tiempoPromedioMinutos
    };
  } catch (error) {
    console.error('Error generando datos del reporte de pedidos:', error);
    throw error;
  }
}

async function generarDatosReportePedidos() {
  // Similar a la anterior pero para pedidos
  return datosReporte;
}


// Función para generar PDF
async function generarPDF(tipo, datos) {
  const PDFDocument = require('pdfkit');
  const fs = require('fs-extra');
  const path = require('path');
  
  // Crear directorio si no existe
  const reportDir = path.join(__dirname, '../public/reports');
  await fs.ensureDir(reportDir);
  
  // Crear nombre de archivo único
  const timestamp = new Date().getTime();
  const filePath = path.join(reportDir, `${tipo}_${timestamp}.pdf`);
  
  // Crear documento PDF
  const doc = new PDFDocument();
  const stream = fs.createWriteStream(filePath);
  
  return new Promise((resolve, reject) => {
    // Eventos del stream
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
    
    // Pipe del documento al stream
    doc.pipe(stream);
    
    // Generar contenido según el tipo de reporte
    doc.fontSize(20).text(`Reporte de ${tipo.toUpperCase()}`, {
      align: 'center'
    });
    
    doc.moveDown();
    doc.fontSize(12).text(`Generado el: ${new Date().toLocaleString()}`, {
      align: 'center'
    });
    
    doc.moveDown();
    
    switch (tipo) {
      case 'ventas':
        generarContenidoPDFVentas(doc, datos);
        break;
      case 'productos':
        generarContenidoPDFProductos(doc, datos);
        break;
      case 'pedidos':
        generarContenidoPDFPedidos(doc, datos);
        break;
    }
    
    // Finalizar documento
    doc.end();
  });
}

// Función para generar Excel
async function generarExcel(tipo, datos) {
  const Excel = require('exceljs');
  const fs = require('fs-extra');
  const path = require('path');
  
  // Crear directorio si no existe
  const reportDir = path.join(__dirname, '../public/reports');
  await fs.ensureDir(reportDir);
  
  // Crear nombre de archivo único
  const timestamp = new Date().getTime();
  const filePath = path.join(reportDir, `${tipo}_${timestamp}.xlsx`);
  
  // Crear libro Excel
  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet(`Reporte de ${tipo}`);
  
  // Llenar la hoja según el tipo de reporte
  switch (tipo) {
    case 'ventas':
      generarExcelVentas(worksheet, datos);
      break;
    case 'productos':
      generarExcelProductos(worksheet, datos);
      break;
    case 'pedidos':
      generarExcelPedidos(worksheet, datos);
      break;
  }
  
  // Guardar archivo
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

// Funciones para generar contenido específico según el tipo de reporte
function generarContenidoPDFVentas(doc, datos) {
  doc.fontSize(16).text('Resumen de Ventas');
  doc.moveDown();
  
  doc.fontSize(14).text('Ventas del día');
  doc.fontSize(12).text(`Total: $${datos.hoy.total.toFixed(2)}`);
  doc.fontSize(12).text(`Cantidad: ${datos.hoy.cantidad}`);
  doc.moveDown();
  
  doc.fontSize(14).text('Ventas de la semana');
  doc.fontSize(12).text(`Total: $${datos.semana.total.toFixed(2)}`);
  doc.fontSize(12).text(`Cantidad: ${datos.semana.cantidad}`);
  doc.moveDown();
  
  doc.fontSize(14).text('Ventas del mes');
  doc.fontSize(12).text(`Total: $${datos.mes.total.toFixed(2)}`);
  doc.fontSize(12).text(`Cantidad: ${datos.mes.cantidad}`);
  doc.moveDown();
  
  doc.fontSize(16).text('Top Clientes');
  datos.topClientes.forEach((cliente, index) => {
    doc.fontSize(12).text(`${index + 1}. ${cliente.nombre}: $${cliente.total.toFixed(2)}`);
  });
  
  // Puedes añadir más secciones según necesites
}

function generarExcelVentas(worksheet, datos) {
  // Configurar encabezados
  worksheet.addRow(['REPORTE DE VENTAS']);
  worksheet.addRow(['Generado el:', new Date().toLocaleString()]);
  worksheet.addRow([]);
  
  // Sección de resumen
  worksheet.addRow(['RESUMEN DE VENTAS']);
  worksheet.addRow(['Período', 'Total', 'Cantidad']);
  worksheet.addRow(['Hoy', datos.hoy.total, datos.hoy.cantidad]);
  worksheet.addRow(['Semana', datos.semana.total, datos.semana.cantidad]);
  worksheet.addRow(['Mes', datos.mes.total, datos.mes.cantidad]);
  worksheet.addRow([]);
  
  // Sección de top clientes
  worksheet.addRow(['TOP CLIENTES']);
  worksheet.addRow(['#', 'Nombre', 'Total']);
  datos.topClientes.forEach((cliente, index) => {
    worksheet.addRow([index + 1, cliente.nombre, cliente.total]);
  });
  worksheet.addRow([]);
  
  // Sección de ventas por hora
  worksheet.addRow(['VENTAS POR HORA']);
  worksheet.addRow(['Hora', 'Total']);
  datos.ventasPorHora.forEach(venta => {
    worksheet.addRow([venta.hora, venta.total]);
  });
  
  // Dar formato a los encabezados
  worksheet.getRow(1).font = { bold: true, size: 16 };
  worksheet.getRow(4).font = { bold: true, size: 14 };
  worksheet.getRow(5).font = { bold: true };
  worksheet.getRow(10).font = { bold: true, size: 14 };
  worksheet.getRow(11).font = { bold: true };
}

// Implementar funciones similares para productos y pedidos
function generarContenidoPDFProductos(doc, datos) {
  // Implementación similar a la de ventas
}

function generarExcelProductos(worksheet, datos) {
  // Implementación similar a la de ventas
}

function generarContenidoPDFPedidos(doc, datos) {
  // Implementación similar a la de ventas
}

function generarExcelPedidos(worksheet, datos) {
  // Implementación similar a la de ventas
}

module.exports = router;