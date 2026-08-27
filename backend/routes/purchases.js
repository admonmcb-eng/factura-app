const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { from, to } = req.query;
  let rows;
  if (from && to) {
    rows = db.prepare('SELECT * FROM purchases WHERE date BETWEEN ? AND ? ORDER BY date DESC, id DESC').all(from, to);
  } else {
    rows = db.prepare('SELECT * FROM purchases ORDER BY date DESC, id DESC').all();
  }
  res.json(rows);
});

router.post('/', (req, res) => {
  const { date, supplier, product_id, item_name, quantity, unit_cost, notes } = req.body;
  if (!date || !item_name || !quantity) {
    return res.status(400).json({ error: 'Fecha, ítem y cantidad son obligatorios' });
  }

  const qty = Number(quantity);
  const cost = Number(unit_cost || 0);
  const total = qty * cost;

  const insertPurchase = db.prepare(`
    INSERT INTO purchases (date, supplier, product_id, item_name, quantity, unit_cost, total, notes)
    VALUES (?,?,?,?,?,?,?,?)
  `);
  const bumpStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');

  const tx = db.transaction(() => {
    const info = insertPurchase.run(date, supplier || null, product_id || null, item_name, qty, cost, total, notes || null);
    if (product_id) {
      bumpStock.run(qty, product_id);
    }
    return info.lastInsertRowid;
  });

  const id = tx();
  res.status(201).json(db.prepare('SELECT * FROM purchases WHERE id = ?').get(id));
});

router.delete('/:id', (req, res) => {
  const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id);
  if (!purchase) return res.status(404).json({ error: 'Compra no encontrada' });

  const tx = db.transaction(() => {
    if (purchase.product_id) {
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(purchase.quantity, purchase.product_id);
    }
    db.prepare('DELETE FROM purchases WHERE id = ?').run(req.params.id);
  });
  tx();

  res.status(204).end();
});

module.exports = router;
