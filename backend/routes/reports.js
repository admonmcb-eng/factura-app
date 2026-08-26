const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/sales', (req, res) => {
  const { from, to } = req.query;
  const rows = db.prepare(`
    SELECT invoices.*, clients.name as client_name
    FROM invoices JOIN clients ON clients.id = invoices.client_id
    WHERE issue_date BETWEEN ? AND ? AND status != 'anulada'
    ORDER BY issue_date
  `).all(from || '0000-01-01', to || '9999-12-31');
  const total = rows.reduce((sum, r) => sum + r.total, 0);
  res.json({ rows, total });
});

router.get('/pending', (req, res) => {
  const rows = db.prepare(`
    SELECT invoices.*, clients.name as client_name
    FROM invoices JOIN clients ON clients.id = invoices.client_id
    WHERE status IN ('pendiente','parcial','vencida')
    ORDER BY due_date
  `).all();
  const totalPending = rows.reduce((sum, r) => sum + (r.total - r.paid_total), 0);
  res.json({ rows, totalPending });
});

router.get('/income-vs-expenses', (req, res) => {
  const { from, to } = req.query;
  const income = db.prepare(`
    SELECT COALESCE(SUM(total),0) as total FROM invoices
    WHERE issue_date BETWEEN ? AND ? AND status != 'anulada'
  `).get(from || '0000-01-01', to || '9999-12-31').total;
  const expenses = db.prepare(`
    SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date BETWEEN ? AND ?
  `).get(from || '0000-01-01', to || '9999-12-31').total;
  res.json({ income, expenses, net: income - expenses });
});

module.exports = router;
