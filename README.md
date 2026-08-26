# Contafácil — App de contabilidad y facturación

Aplicación web básica de contabilidad y facturación (estilo Alegra), con clientes,
productos, facturas de venta con generación de PDF, abonos/pagos, gastos y reportes.

## Estructura

```
factura-app/
├── backend/     API en Node.js + Express + SQLite (better-sqlite3)
└── frontend/    App en React + Vite + Tailwind CSS
```

## Requisitos

- Node.js 18 o superior
- npm

## 1. Backend (API)

```bash
cd backend
npm install
cp .env.example .env
npm start
```

Esto crea automáticamente el archivo `data.sqlite` con todas las tablas, y un
usuario de acceso por defecto:

- **Correo:** admin@empresa.com
- **Contraseña:** admin123

La API queda disponible en `http://localhost:4000`.

## 2. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

La app queda disponible en `http://localhost:5173` (el proxy ya está configurado
para hablar con la API en el puerto 4000).

## Primeros pasos dentro de la app

1. Inicia sesión con el usuario de prueba.
2. Ve a **Empresa** y actualiza el nombre, NIT, dirección, teléfono y correo —
   esto aparece en el encabezado de todas las facturas en PDF.
3. Crea tus **Clientes** y **Productos**.
4. Ve a **Facturas → Nueva factura**, selecciona el cliente, agrega ítems y
   guarda. Desde el detalle de la factura puedes **descargar el PDF** y
   **registrar abonos/pagos**.
5. Registra tus **Gastos** para ver el balance de ingresos vs. gastos en
   **Reportes**, donde también puedes exportar CSV de ventas y cartera pendiente.

## Notas técnicas

- La base de datos es un solo archivo SQLite (`backend/data.sqlite`), ideal para
  una empresa pequeña. Para producción con varios usuarios concurrentes se
  recomienda migrar a PostgreSQL (el esquema en `backend/db.js` es fácilmente
  portable).
- El PDF de la factura se genera con `pdfkit` replicando el formato: encabezado
  de empresa, bloque de datos del cliente, fechas de expedición/vencimiento,
  tabla de ítems y totales, y pie de firmas — igual a la factura de referencia
  que compartiste.
- Cambia `JWT_SECRET` en el archivo `.env` antes de usar esto en producción.
- Próximos pasos sugeridos: facturación electrónica DIAN, multiempresa, roles
  de usuario, nómina, conciliación bancaria.
