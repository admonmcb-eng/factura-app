const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const q = req.query.q;
  let rows;
  if (q) {
    rows = db.prepare('SELECT * FROM products WHERE name LIKE ? ORDER BY name').all(`%${q}%`);
  } else {
    rows = db.prepare('SELECT * FROM products ORDER BY name').all();
  }
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, unit, price, stock, track_stock, category } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
  const info = db.prepare('INSERT INTO products (name, unit, price, stock, track_stock, category) VALUES (?,?,?,?,?,?)')
    .run(name, unit || 'Unidad', price, stock || 0, track_stock ? 1 : 0, category);
  res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, unit, price, stock, track_stock, category } = req.body;
  db.prepare('UPDATE products SET name=?, unit=?, price=?, stock=?, track_stock=?, category=? WHERE id=?')
    .run(name, unit, price, stock, track_stock ? 1 : 0, category, req.params.id);
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
