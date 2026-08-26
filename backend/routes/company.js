const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const company = db.prepare('SELECT * FROM company WHERE id = 1').get();
  res.json(company);
});

router.put('/', (req, res) => {
  const { name, nit, address, city, phone, email, logo_url, currency, tax_rate } = req.body;
  db.prepare(`UPDATE company SET name=?, nit=?, address=?, city=?, phone=?, email=?, logo_url=?, currency=?, tax_rate=? WHERE id=1`)
    .run(name, nit, address, city, phone, email, logo_url, currency, tax_rate ?? 0);
  res.json(db.prepare('SELECT * FROM company WHERE id = 1').get());
});

module.exports = router;
