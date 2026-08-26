const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { generateInvoicePdf } = require('../pdf/generateInvoice');

const router = express.Router();
router.use(requireAuth);

function recalcStatus(invoice) {
  if (invoice.paid_total >= invoice.total && invoice.total > 0) return 'pagada';
  if (invoice.status === 'anulada') return 'anulada';
  const due = new Date(invoice.due_date);
  if (due < new Date() && invoice.paid_total < invoice.total) return 'vencida';
  return invoice.paid_total > 0 ? 'parcial' : 'pendiente';
}

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT invoices.*, clients.name as client_name
    FROM invoices JOIN clients ON clients.id = invoices.client_id
    ORDER BY invoices.issue_date DESC, invoices.id DESC
  `).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(invoice.client_id);
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id);
  const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY paid_at').all(invoice.id);
  res.json({ ...invoice, client, items, payments });
});

router.post('/', (req, res) => {
  const { client_id, issue_date, due_date, items, tax_rate, notes } = req.body;
  if (!client_id || !issue_date || !due_date || !items || !items.length) {
    return res.status(400).json({ error: 'Cliente, fechas e ítems son obligatorios' });
  }

  const company = db.prepare('SELECT * FROM company WHERE id = 1').get();
  const number = company.next_invoice_number || 1;

  let subtotal = 0, discountTotal = 0;
  const computedItems = items.map((it) => {
    const lineGross = it.price * it.quantity;
    const lineDiscount = it.discount || 0;
    const lineTotal = lineGross - lineDiscount;
    subtotal += lineGross;
    discountTotal += lineDiscount;
    return { ...it, total: lineTotal };
  });
  const taxTotal = tax_rate ? (subtotal - discountTotal) * (tax_rate / 100) : 0;
  const total = subtotal - discountTotal + taxTotal;

  const insertInvoice = db.prepare(`
    INSERT INTO invoices (number, client_id, issue_date, due_date, subtotal, discount_total, tax_total, total, paid_total, status, notes)
    VALUES (?,?,?,?,?,?,?,?,0,'pendiente',?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO invoice_items (invoice_id, product_id, item_name, price, quantity, discount, total)
    VALUES (?,?,?,?,?,?,?)
  `);
  const decrementStock = db.prepare(`UPDATE products SET stock = stock - ? WHERE id = ? AND track_stock = 1`);
  const bumpNumber = db.prepare('UPDATE company SET next_invoice_number = ? WHERE id = 1');

  const tx = db.transaction(() => {
    const info = insertInvoice.run(number, client_id, issue_date, due_date, subtotal, discountTotal, taxTotal, total, notes || null);
    const invoiceId = info.lastInsertRowid;
    computedItems.forEach((it) => {
      insertItem.run(invoiceId, it.product_id || null, it.item_name, it.price, it.quantity, it.discount || 0, it.total);
      if (it.product_id) decrementStock.run(it.quantity, it.product_id);
    });
    bumpNumber.run(number + 1);
    return invoiceId;
  });

  const invoiceId = tx();
  res.status(201).json(db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId));
});

router.post('/:id/void', (req, res) => {
  db.prepare("UPDATE invoices SET status = 'anulada' WHERE id = ?").run(req.params.id);
  res.json(db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id));
});

router.get('/:id/pdf', (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(invoice.client_id);
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id);
  const company = db.prepare('SELECT * FROM company WHERE id = 1').get();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="factura-${invoice.number}.pdf"`);
  generateInvoicePdf({ company, client, invoice, items }, res);
});

module.exports = router;
