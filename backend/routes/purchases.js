const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const itemsOf = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ? ORDER BY id');

function withItems(purchase) {
  return { ...purchase, items: itemsOf.all(purchase.id) };
}

router.get('/', (req, res) => {
  const { from, to } = req.query;
  let rows;
  if (from && to) {
    rows = db.prepare('SELECT * FROM purchases WHERE date BETWEEN ? AND ? ORDER BY date DESC, id DESC').all(from, to);
  } else {
    rows = db.prepare('SELECT * FROM purchases ORDER BY date DESC, id DESC').all();
  }
  res.json(rows.map(withItems));
});

router.get('/:id', (req, res) => {
  const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id);
  if (!purchase) return res.status(404).json({ error: 'Compra no encontrada' });
  res.json(withItems(purchase));
});

router.post('/', (req, res) => {
  const { date, supplier_id, notes } = req.body;
  let { items } = req.body;

  // Compatibilidad: si llega una compra con un solo ítem en el formato anterior.
  if (!Array.isArray(items) && req.body.item_name) {
    items = [{
      product_id: req.body.product_id,
      item_name: req.body.item_name,
      quantity: req.body.quantity,
      unit_cost: req.body.unit_cost,
    }];
  }

  if (!date || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'La fecha y al menos un ítem son obligatorios' });
  }

  const computedItems = [];
  for (const it of items) {
    const name = String(it.item_name || '').trim();
    const qty = Number(it.quantity);
    const cost = Number(it.unit_cost || 0);
    if (!name || !qty || Number.isNaN(qty)) {
      return res.status(400).json({ error: 'Cada ítem necesita descripción y cantidad' });
    }
    if (Number.isNaN(cost) || cost < 0) {
      return res.status(400).json({ error: `Costo unitario inválido en "${name}"` });
    }
    computedItems.push({
      product_id: it.product_id || null,
      item_name: name,
      quantity: qty,
      unit_cost: cost,
      total: qty * cost,
    });
  }
  const total = computedItems.reduce((sum, it) => sum + it.total, 0);

  let supplierName = null;
  if (supplier_id) {
    const supplierRow = db.prepare('SELECT name FROM suppliers WHERE id = ?').get(supplier_id);
    supplierName = supplierRow ? supplierRow.name : null;
  }

  const insertPurchase = db.prepare(`
    INSERT INTO purchases (date, supplier, supplier_id, total, notes)
    VALUES (?,?,?,?,?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO purchase_items (purchase_id, product_id, item_name, quantity, unit_cost, total)
    VALUES (?,?,?,?,?,?)
  `);
  const bumpStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
  const updateCost = db.prepare('UPDATE products SET cost = ? WHERE id = ?');
  const insertExpense = db.prepare(`
    INSERT INTO expenses (date, supplier, category, amount, description, purchase_id)
    VALUES (?,?,?,?,?,?)
  `);

  const tx = db.transaction(() => {
    const info = insertPurchase.run(date, supplierName, supplier_id || null, total, notes || null);
    const purchaseId = info.lastInsertRowid;

    for (const it of computedItems) {
      insertItem.run(purchaseId, it.product_id, it.item_name, it.quantity, it.unit_cost, it.total);
      if (it.product_id) {
        bumpStock.run(it.quantity, it.product_id);
        updateCost.run(it.unit_cost, it.product_id);
      }
    }

    const description = computedItems.length === 1
      ? `Compra: ${computedItems[0].item_name} x${computedItems[0].quantity}`
      : `Compra (${computedItems.length} ítems): ${computedItems.map((it) => `${it.item_name} x${it.quantity}`).join(', ')}`;
    insertExpense.run(date, supplierName, 'Compras', total, description, purchaseId);

    return purchaseId;
  });

  try {
    const id = tx();
    res.status(201).json(withItems(db.prepare('SELECT * FROM purchases WHERE id = ?').get(id)));
  } catch (e) {
    res.status(400).json({ error: `No se pudo guardar la compra: ${e.message}` });
  }
});

router.delete('/:id', (req, res) => {
  const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id);
  if (!purchase) return res.status(404).json({ error: 'Compra no encontrada' });
  const items = itemsOf.all(purchase.id);

  const tx = db.transaction(() => {
    const dropStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
    for (const it of items) {
      if (it.product_id) dropStock.run(it.quantity, it.product_id);
    }
    db.prepare('DELETE FROM expenses WHERE purchase_id = ?').run(purchase.id);
    db.prepare('DELETE FROM purchase_items WHERE purchase_id = ?').run(purchase.id);
    db.prepare('DELETE FROM purchases WHERE id = ?').run(purchase.id);
  });
  tx();

  res.status(204).end();
});

module.exports = router;
