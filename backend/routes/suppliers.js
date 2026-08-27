const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const q = req.query.q;
  let rows;
  if (q) {
    rows = db.prepare('SELECT * FROM suppliers WHERE name LIKE ? ORDER BY name').all(`%${q}%`);
  } else {
    rows = db.prepare('SELECT * FROM suppliers ORDER BY name').all();
  }
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, identification, address, city, phone, email } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const info = db.prepare('INSERT INTO suppliers (name, identification, address, city, phone, email) VALUES (?,?,?,?,?,?)')
    .run(name, identification, address, city, phone, email);
  res.status(201).json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, identification, address, city, phone, email } = req.body;
  db.prepare('UPDATE suppliers SET name=?, identification=?, address=?, city=?, phone=?, email=? WHERE id=?')
    .run(name, identification, address, city, phone, email, req.params.id);
  res.json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
