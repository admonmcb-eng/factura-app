const PDFDocument = require('pdfkit');

function money(n, currency = 'COP') {
  const v = Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `$${v}`;
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString('es-CO');
}

/**
 * Genera el PDF de una factura de venta y lo escribe en el stream `res`.
 * company: fila de la tabla company
 * client: fila de la tabla clients
 * invoice: fila de la tabla invoices
 * items: filas de invoice_items
 */
function generateInvoicePdf({ company, client, invoice, items }, stream) {
  const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
  doc.pipe(stream);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;

  // --- Encabezado ---
  doc.font('Helvetica-Bold').fontSize(14).text(company.name || 'Mi Empresa', left, 40, { width: pageWidth * 0.6 });
  doc.font('Helvetica').fontSize(9);
  doc.text(company.nit ? String(company.nit) : '', left, doc.y, { width: pageWidth * 0.6 });
  doc.text(company.address || '', { width: pageWidth * 0.6 });
  doc.text(company.phone || '', { width: pageWidth * 0.6 });
  doc.text(company.email || '', { width: pageWidth * 0.6 });

  doc.font('Helvetica').fontSize(9).text('Factura de venta', left + pageWidth * 0.65, 40, { width: pageWidth * 0.35, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(13).text(`No. ${invoice.number}`, left + pageWidth * 0.65, doc.y, { width: pageWidth * 0.35, align: 'right' });
  doc.font('Helvetica').fontSize(9).text('Factura de venta original', left + pageWidth * 0.65, doc.y, { width: pageWidth * 0.35, align: 'right' });

  let y = 115;
  doc.moveTo(left, y).lineTo(left + pageWidth, y).strokeColor('#cccccc').stroke();
  y += 8;

  // --- Bloque cliente / fechas ---
  const labelColW = 90;
  const leftColX = left;
  const rightColX = left + pageWidth * 0.68;
  const rightColW = pageWidth * 0.32;

  function row(label, value, x, w, shadeLabel = true) {
    const rowH = 16;
    if (shadeLabel) {
      doc.rect(x, y, labelColW, rowH).fill('#e5e5e5');
      doc.fillColor('#000').font('Helvetica-Bold').fontSize(8).text(label, x + 3, y + 4, { width: labelColW - 6 });
    }
    doc.font('Helvetica').fontSize(9).fillColor('#000').text(value || '', x + labelColW + 4, y + 4, { width: w - labelColW - 4 });
    return rowH;
  }

  const startY = y;
  y += row('SEÑOR(ES)', client.name, leftColX, pageWidth * 0.65);
  y += row('DIRECCIÓN', client.address, leftColX, pageWidth * 0.65);
  y += row('CIUDAD', client.city, leftColX, pageWidth * 0.65);
  y += row('TELÉFONO', client.phone, leftColX, pageWidth * 0.65);
  const identY = y;
  doc.rect(leftColX, identY, labelColW + 20, 16).fill('#e5e5e5');
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(8).text('IDENTIFICACIÓN', leftColX + 3, identY + 4, { width: labelColW + 14 });
  doc.font('Helvetica').fontSize(9).text(client.identification || '', leftColX + labelColW + 24, identY + 4);

  // Fechas a la derecha
  let ry = startY;
  doc.rect(rightColX, ry, rightColW, 14).fill('#e5e5e5');
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(8).text('FECHA DE EXPEDICIÓN', rightColX, ry + 4, { width: rightColW, align: 'center' });
  ry += 14;
  doc.font('Helvetica').fontSize(9).text(formatDate(invoice.issue_date), rightColX, ry + 3, { width: rightColW, align: 'center' });
  ry += 18;
  doc.rect(rightColX, ry, rightColW, 14).fill('#e5e5e5');
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(8).text('FECHA DE VENCIMIENTO', rightColX, ry + 4, { width: rightColW, align: 'center' });
  ry += 14;
  doc.font('Helvetica').fontSize(9).text(formatDate(invoice.due_date), rightColX, ry + 3, { width: rightColW, align: 'center' });

  y = Math.max(y + 20, ry + 20);

  // --- Tabla de ítems ---
  const colX = {
    item: left,
    price: left + pageWidth * 0.45,
    qty: left + pageWidth * 0.62,
    discount: left + pageWidth * 0.74,
    total: left + pageWidth * 0.86,
  };
  const tableTop = y;
  doc.rect(left, tableTop, pageWidth, 18).fill('#333333');
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8.5);
  doc.text('Ítem', colX.item + 4, tableTop + 5);
  doc.text('Precio', colX.price, tableTop + 5, { width: pageWidth * 0.17 - 4, align: 'right' });
  doc.text('Cantidad', colX.qty, tableTop + 5, { width: pageWidth * 0.12 - 4, align: 'right' });
  doc.text('Descuento', colX.discount, tableTop + 5, { width: pageWidth * 0.12 - 4, align: 'right' });
  doc.text('Total', colX.total, tableTop + 5, { width: pageWidth * 0.14 - 4, align: 'right' });

  y = tableTop + 18;
  doc.fillColor('#000').font('Helvetica').fontSize(9);
  items.forEach((it, idx) => {
    const rowH = 16;
    if (idx % 2 === 1) doc.rect(left, y, pageWidth, rowH).fill('#f7f7f7').fillColor('#000');
    doc.fillColor('#000');
    doc.text(it.item_name, colX.item + 4, y + 4, { width: pageWidth * 0.45 - 8 });
    doc.text(money(it.price, company.currency), colX.price, y + 4, { width: pageWidth * 0.17 - 4, align: 'right' });
    doc.text(String(it.quantity), colX.qty, y + 4, { width: pageWidth * 0.12 - 4, align: 'right' });
    doc.text(it.discount ? money(it.discount, company.currency) : '', colX.discount, y + 4, { width: pageWidth * 0.12 - 4, align: 'right' });
    doc.text(money(it.total, company.currency), colX.total, y + 4, { width: pageWidth * 0.14 - 4, align: 'right' });
    y += rowH;
  });

  const tableBottom = Math.max(y, tableTop + 18 + 16 * 6);
  doc.rect(left, tableTop, pageWidth, tableBottom - tableTop).strokeColor('#cccccc').stroke();
  // vertical lines
  [colX.price, colX.qty, colX.discount, colX.total].forEach((x) => {
    doc.moveTo(x, tableTop).lineTo(x, tableBottom).strokeColor('#e0e0e0').stroke();
  });

  y = tableBottom + 10;

  // --- Totales ---
  const totalsW = 200;
  const totalsX = left + pageWidth - totalsW;
  function totalRow(label, value, bold = false) {
    doc.rect(totalsX, y, totalsW * 0.55, 16).fill('#e5e5e5');
    doc.rect(totalsX + totalsW * 0.55, y, totalsW * 0.45, 16).fill(bold ? '#333333' : '#ffffff').stroke('#cccccc');
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica-Bold').fontSize(9).fillColor('#000')
      .text(label, totalsX + 4, y + 4, { width: totalsW * 0.55 - 8 });
    doc.font('Helvetica').fontSize(9).fillColor(bold ? '#fff' : '#000')
      .text(value, totalsX + totalsW * 0.55 + 4, y + 4, { width: totalsW * 0.45 - 8, align: 'right' });
    y += 16;
  }
  totalRow('Subtotal', money(invoice.subtotal, company.currency));
  if (invoice.discount_total) totalRow('Descuento', money(invoice.discount_total, company.currency));
  if (invoice.tax_total) totalRow('Impuestos', money(invoice.tax_total, company.currency));
  totalRow('Total', money(invoice.total, company.currency), true);

  // --- Pie de página con firmas ---
  const footerY = doc.page.height - doc.page.margins.bottom - 60;
  doc.fillColor('#000');
  doc.moveTo(left, footerY).lineTo(left + 180, footerY).strokeColor('#000').stroke();
  doc.font('Helvetica').fontSize(8).text('ELABORADO POR', left, footerY + 4);

  doc.moveTo(left + 240, footerY).lineTo(left + 240 + 220, footerY).strokeColor('#000').stroke();
  doc.font('Helvetica').fontSize(8).text('ACEPTADA, FIRMA Y/O SELLO Y FECHA', left + 240, footerY + 4);

  doc.end();
}

module.exports = { generateInvoicePdf };
