const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.post('/', (req, res) => {
  const { invoice_id, amount, method, paid_at, notes } = req.body;
  if (!invoice_id || !amount || !paid_at) return res.status(400).json({ error: 'Factura, monto y fecha son obligatorios' });

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice_id);
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO payments (invoice_id, amount, method, paid_at, notes) VALUES (?,?,?,?,?)')
      .run(invoice_id, amount, method || 'efectivo', paid_at, notes || null);
    const newPaid = invoice.paid_total + Number(amount);
    let status = 'parcial';
    if (newPaid >= invoice.total) status = 'pagada';
    db.prepare('UPDATE invoices SET paid_total = ?, status = ? WHERE id = ?').run(newPaid, status, invoice_id);
  });
  tx();

  res.status(201).json(db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice_id));
});

router.get('/invoice/:invoiceId', (req, res) => {
  res.json(db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY paid_at').all(req.params.invoiceId));
});

module.exports = router;
