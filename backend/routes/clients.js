const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const q = req.query.q;
  let rows;
  if (q) {
    rows = db.prepare('SELECT * FROM clients WHERE name LIKE ? OR identification LIKE ? ORDER BY name').all(`%${q}%`, `%${q}%`);
  } else {
    rows = db.prepare('SELECT * FROM clients ORDER BY name').all();
  }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
  const invoices = db.prepare('SELECT * FROM invoices WHERE client_id = ? ORDER BY issue_date DESC').all(req.params.id);
  res.json({ ...client, invoices });
});

router.post('/', (req, res) => {
  const { name, identification, address, city, phone, email } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const info = db.prepare('INSERT INTO clients (name, identification, address, city, phone, email) VALUES (?,?,?,?,?,?)')
    .run(name, identification, address, city, phone, email);
  res.status(201).json(db.prepare('SELECT * FROM clients WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, identification, address, city, phone, email } = req.body;
  db.prepare('UPDATE clients SET name=?, identification=?, address=?, city=?, phone=?, email=? WHERE id=?')
    .run(name, identification, address, city, phone, email, req.params.id);
  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
