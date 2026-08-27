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
  const { date, supplier_id, product_id, item_name, quantity, unit_cost, notes } = req.body;
  if (!date || !item_name || !quantity) {
    return res.status(400).json({ error: 'Fecha, ítem y cantidad son obligatorios' });
  }

  const qty = Number(quantity);
  const cost = Number(unit_cost || 0);
  const total = qty * cost;

  let supplierName = null;
  if (supplier_id) {
    const supplierRow = db.prepare('SELECT name FROM suppliers WHERE id = ?').get(supplier_id);
    supplierName = supplierRow ? supplierRow.name : null;
  }

  const insertPurchase = db.prepare(`
    INSERT INTO purchases (date, supplier, supplier_id, product_id, item_name, quantity, unit_cost, total, notes)
    VALUES (?,?,?,?,?,?,?,?,?)
  `);
  const bumpStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
  const updateCost = db.prepare('UPDATE products SET cost = ? WHERE id = ?');
  const insertExpense = db.prepare(`
    INSERT INTO expenses (date, supplier, category, amount, description, purchase_id)
    VALUES (?,?,?,?,?,?)
  `);

  const tx = db.transaction(() => {
    const info = insertPurchase.run(date, supplierName, supplier_id || null, product_id || null, item_name, qty, cost, total, notes || null);
    const purchaseId = info.lastInsertRowid;
    if (product_id) {
      bumpStock.run(qty, product_id);
      updateCost.run(cost, product_id);
    }
    insertExpense.run(
      date,
      supplierName,
      'Compras',
      total,
      `Compra: ${item_name} x${qty}`,
      purchaseId
    );
    return purchaseId;
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
    db.prepare('DELETE FROM expenses WHERE purchase_id = ?').run(req.params.id);
    db.prepare('DELETE FROM purchases WHERE id = ?').run(req.params.id);
  });
  tx();

  res.status(204).end();
});

module.exports = router;
