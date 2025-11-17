import PDFDocument from 'pdfkit';

export function buildReportPdf({ tipo, fecha_inicio, fecha_fin, items }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(`Reporte ${tipo}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Rango: ${fecha_inicio} - ${fecha_fin}`);
    doc.moveDown();

    items.forEach((item, index) => {
      doc.fontSize(12).text(`${index + 1}. Código: ${item.codigo} | Cliente: ${item.cliente_nombre}`);
      doc.text(`Monto: S/. ${item.monto.toFixed(2)} | Origen: ${item.origen}`);
      doc.text(`Fecha: ${item.fecha}`);
      doc.moveDown(0.25);
    });

    if (items.length === 0) {
      doc.text('Sin resultados para el rango seleccionado.');
    }

    doc.end();
  });
}
