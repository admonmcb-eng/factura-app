const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// En Railway, DB_PATH apunta al volumen permanente (por ejemplo /data/data.sqlite)
// para que los datos no se borren cuando el servidor se reinicia o se vuelve a desplegar.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.sqlite');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
console.log(`Base de datos: ${DB_PATH}`);

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS company (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT 'Mi Empresa',
  nit TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  currency TEXT DEFAULT 'COP',
  tax_rate REAL DEFAULT 0,
  next_invoice_number INTEGER DEFAULT 1
);
INSERT OR IGNORE INTO company (id) VALUES (1);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  identification TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  identification TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'Unidad',
  price REAL NOT NULL DEFAULT 0,
  cost REAL DEFAULT 0,
  stock REAL DEFAULT 0,
  track_stock INTEGER DEFAULT 0,
  category TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number INTEGER NOT NULL,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  discount_total REAL NOT NULL DEFAULT 0,
  tax_total REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  paid_total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendiente',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  item_name TEXT NOT NULL,
  price REAL NOT NULL,
  quantity REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  method TEXT DEFAULT 'efectivo',
  paid_at TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  supplier TEXT,
  category TEXT,
  amount REAL NOT NULL,
  description TEXT,
  purchase_id INTEGER REFERENCES purchases(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  supplier TEXT,
  supplier_id INTEGER REFERENCES suppliers(id),
  total REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  item_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_cost REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0
);
`);

// Migraciones seguras para bases de datos creadas antes de estas columnas.
try {
  db.exec('ALTER TABLE expenses ADD COLUMN purchase_id INTEGER REFERENCES purchases(id)');
} catch (e) {
  // La columna ya existe, no hacer nada.
}
try {
  db.exec('ALTER TABLE products ADD COLUMN cost REAL DEFAULT 0');
} catch (e) {
  // La columna ya existe, no hacer nada.
}
try {
  db.exec('ALTER TABLE purchases ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id)');
} catch (e) {
  // La columna ya existe, no hacer nada.
}

// Migración: compras con varios ítems.
// Antes cada compra tenía un solo ítem guardado en la misma tabla "purchases".
// Si la base de datos todavía tiene ese formato, cada compra antigua pasa a
// "purchase_items" como su único ítem y la tabla "purchases" se reconstruye
// sin esas columnas. Los IDs de las compras se conservan, así que los gastos
// vinculados (expenses.purchase_id) siguen apuntando a la compra correcta.
const purchaseColumns = db.prepare('PRAGMA table_info(purchases)').all().map((c) => c.name);
if (purchaseColumns.includes('item_name')) {
  console.log('Migrando compras al formato de varios ítems por compra...');

  // Copia de seguridad del archivo antes de cambiar la estructura.
  try {
    const backupPath = DB_PATH.replace(/(\.sqlite)?$/, `.antes-compras-multiples-${Date.now()}.sqlite`);
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`Copia de seguridad creada: ${backupPath}`);
  } catch (e) {
    console.error('No se pudo crear la copia de seguridad:', e.message);
  }

  // Las llaves foráneas se desactivan durante la reconstrucción para que
  // borrar la tabla vieja no elimine en cascada los ítems recién copiados.
  db.pragma('foreign_keys = OFF');
  try {
    db.transaction(() => {
      db.exec(`
        INSERT INTO purchase_items (purchase_id, product_id, item_name, quantity, unit_cost, total)
        SELECT id, product_id, item_name, quantity, unit_cost, total
        FROM purchases
        WHERE id NOT IN (SELECT purchase_id FROM purchase_items);

        CREATE TABLE purchases_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          supplier TEXT,
          supplier_id INTEGER REFERENCES suppliers(id),
          total REAL NOT NULL DEFAULT 0,
          notes TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );

        INSERT INTO purchases_new (id, date, supplier, supplier_id, total, notes, created_at)
        SELECT id, date, supplier, supplier_id, total, notes, created_at FROM purchases;

        DROP TABLE purchases;
        ALTER TABLE purchases_new RENAME TO purchases;
      `);
    })();
    const migrated = db.prepare('SELECT COUNT(*) AS c FROM purchase_items').get().c;
    console.log(`Migración de compras completada (${migrated} ítems).`);
  } catch (e) {
    console.error('Error migrando compras (no se cambió nada):', e.message);
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run('Administrador', 'admin@empresa.com', hash);
}

module.exports = db;
