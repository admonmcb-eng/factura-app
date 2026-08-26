const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { from, to } = req.query;
  let rows;
  if (from && to) {
    rows = db.prepare('SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date DESC').all(from, to);
  } else {
    rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
  }
  res.json(rows);
});

router.post('/', (req, res) => {
  const { date, supplier, category, amount, description } = req.body;
  if (!date || !amount) return res.status(400).json({ error: 'Fecha y monto son obligatorios' });
  const info = db.prepare('INSERT INTO expenses (date, supplier, category, amount, description) VALUES (?,?,?,?,?)')
    .run(date, supplier, category, amount, description);
  res.status(201).json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(info.lastInsertRowid));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
