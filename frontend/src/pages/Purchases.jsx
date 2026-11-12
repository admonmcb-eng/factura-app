import React, { useEffect, useState } from 'react';
import { api, formatMoney } from '../api.js';

const emptyItem = () => ({ product_id: '', item_name: '', quantity: 1, unit_cost: 0 });
const emptyForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  supplier_id: '',
  notes: '',
});

function itemsSummary(items) {
  if (!items || items.length === 0) return '';
  const names = items.map((it) => `${it.item_name} x${it.quantity}`);
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} y ${names.length - 2} más`;
}

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [items, setItems] = useState([emptyItem()]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [expanded, setExpanded] = useState(null);

  async function load() {
    setPurchases(await api.getPurchases());
  }
  async function loadCatalogs() {
    api.getProducts().then(setProducts);
    api.getSuppliers().then(setSuppliers);
  }
  useEffect(() => {
    load();
    loadCatalogs();
  }, []);

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function pickProduct(idx, productId) {
    const p = products.find((pr) => String(pr.id) === String(productId));
    if (p) updateItem(idx, { product_id: p.id, item_name: p.name, unit_cost: p.cost || 0 });
    else updateItem(idx, { product_id: '', item_name: '' });
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(idx) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  async function addSupplierInline() {
    if (!newSupplierName.trim()) return;
    const created = await api.createSupplier({ name: newSupplierName.trim() });
    setNewSupplierName('');
    setShowNewSupplier(false);
    await api.getSuppliers().then(setSuppliers);
    setForm((f) => ({ ...f, supplier_id: created.id }));
  }

  function openNewForm() {
    setForm(emptyForm());
    setItems([emptyItem()]);
    setError('');
    setShowForm(true);
  }

  const lineTotal = (it) => Number(it.quantity || 0) * Number(it.unit_cost || 0);
  const formTotal = items.reduce((sum, it) => sum + lineTotal(it), 0);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (items.some((it) => !String(it.item_name).trim() || !Number(it.quantity))) {
      setError('Cada ítem necesita descripción y cantidad.');
      return;
    }
    setSaving(true);
    try {
      await api.createPurchase({
        date: form.date,
        supplier_id: form.supplier_id || null,
        notes: form.notes,
        items: items.map((it) => ({
          product_id: it.product_id || null,
          item_name: String(it.item_name).trim(),
          quantity: Number(it.quantity),
          unit_cost: Number(it.unit_cost || 0),
        })),
      });
      setShowForm(false);
      load();
      loadCatalogs();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm('¿Eliminar esta compra completa? Se descontarán del inventario todos sus productos y se eliminará el gasto vinculado.')) return;
    await api.deletePurchase(id);
    if (expanded === id) setExpanded(null);
    load();
    loadCatalogs();
  }

  const grandTotal = purchases.reduce((sum, p) => sum + p.total, 0);

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy-900">Compras</h1>
        <button className="btn-primary" onClick={openNewForm}>+ Nueva compra</button>
      </div>
      <p className="text-sm text-slate-500">
        Registra aquí lo que compras a tus proveedores. Una compra puede tener varios ítems, cada uno con su cantidad y costo.
        Si eliges un producto del inventario, su stock y costo se actualizan automáticamente.
      </p>

      {showForm && (
        <form onSubmit={submit} className="card p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="label">Proveedor</label>
              {!showNewSupplier ? (
                <div className="flex gap-2">
                  <select className="input" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
                    <option value="">Sin proveedor</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button type="button" className="btn-secondary text-xs whitespace-nowrap" onClick={() => setShowNewSupplier(true)}>+ Nuevo</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input className="input" placeholder="Nombre del proveedor" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
                  <button type="button" className="btn-primary text-xs whitespace-nowrap" onClick={addSupplierInline}>Agregar</button>
                  <button type="button" className="btn-secondary text-xs" onClick={() => setShowNewSupplier(false)}>×</button>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-navy-900 text-sm">Ítems de la compra ({items.length})</h2>
              <button type="button" className="btn-secondary text-xs" onClick={addItem}>+ Agregar ítem</button>
            </div>
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end border-b border-slate-100 pb-3">
                  <div className="col-span-12 md:col-span-3">
                    <label className="label">Producto del inventario</label>
                    <select className="input" value={it.product_id} onChange={(e) => pickProduct(idx, e.target.value)}>
                      <option value="">Ítem manual (no afecta inventario)</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} — stock: {p.track_stock ? p.stock : 'sin control'}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <label className="label">Descripción</label>
                    <input className="input" required value={it.item_name} onChange={(e) => updateItem(idx, { item_name: e.target.value })} />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="label">Cantidad</label>
                    <input className="input" type="number" step="0.01" min="0" required value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="label">Costo unit.</label>
                    <input className="input" type="number" step="0.01" min="0" value={it.unit_cost} onChange={(e) => updateItem(idx, { unit_cost: e.target.value })} />
                  </div>
                  <div className="col-span-3 md:col-span-1 text-right">
                    <div className="label">Subtotal</div>
                    <div className="py-2 text-sm font-mono-num">{formatMoney(lineTotal(it))}</div>
                  </div>
                  <div className="col-span-1 text-right pb-2">
                    <button
                      type="button"
                      title="Quitar ítem"
                      className="text-red-500 font-bold disabled:opacity-30"
                      disabled={items.length === 1}
                      onClick={() => removeItem(idx)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="mt-3 text-sm font-semibold text-teal-600 hover:underline" onClick={addItem}>+ Agregar otro ítem</button>
          </div>

          <div>
            <label className="label">Notas (opcional)</label>
            <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex justify-end text-sm">
            <div className="font-bold text-navy-900">
              Total de la compra: <span className="font-mono-num">{formatMoney(formTotal)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar compra'}</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="card">
        <table className="w-full table-base">
          <thead>
            <tr>
              <th className="w-6"></th><th>Fecha</th><th>Proveedor</th><th>Ítems</th>
              <th className="text-right">Total</th><th></th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <React.Fragment key={p.id}>
                <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                  <td className="text-slate-400">{expanded === p.id ? '▾' : '▸'}</td>
                  <td>{p.date}</td>
                  <td>{p.supplier}</td>
                  <td>
                    {itemsSummary(p.items)}
                    {p.items.length > 1 && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{p.items.length} ítems</span>
                    )}
                  </td>
                  <td className="text-right font-mono-num">{formatMoney(p.total)}</td>
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    <button className="text-red-500 font-semibold hover:underline" onClick={() => remove(p.id)}>Eliminar</button>
                  </td>
                </tr>
                {expanded === p.id && (
                  <tr>
                    <td></td>
                    <td colSpan={5} className="bg-slate-50">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-slate-500 uppercase">
                            <th className="text-left font-semibold py-1">Ítem</th>
                            <th className="text-right font-semibold py-1">Cantidad</th>
                            <th className="text-right font-semibold py-1">Costo unit.</th>
                            <th className="text-right font-semibold py-1">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.items.map((it) => (
                            <tr key={it.id}>
                              <td className="py-1 border-0">{it.item_name}</td>
                              <td className="text-right font-mono-num py-1 border-0">{it.quantity}</td>
                              <td className="text-right font-mono-num py-1 border-0">{formatMoney(it.unit_cost)}</td>
                              <td className="text-right font-mono-num py-1 border-0">{formatMoney(it.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {p.notes && <div className="text-xs text-slate-500 mt-1">Notas: {p.notes}</div>}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {purchases.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-6">No hay compras registradas.</td></tr>}
          </tbody>
          {purchases.length > 0 && (
            <tfoot><tr><td colSpan={4} className="text-right font-semibold">Total</td><td className="text-right font-mono-num font-bold">{formatMoney(grandTotal)}</td><td /></tr></tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
