require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/company', require('./routes/company'));
  app.use('/api/clients', require('./routes/clients'));
  app.use('/api/products', require('./routes/products'));
  app.use('/api/invoices', require('./routes/invoices'));
  app.use('/api/payments', require('./routes/payments'));
  app.use('/api/expenses', require('./routes/expenses'));
  app.use('/api/purchases', require('./routes/purchases'));
  app.use('/api/reports', require('./routes/reports'));

  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }
});
