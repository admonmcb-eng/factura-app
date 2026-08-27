import React, { useEffect, useState } from 'react';
import { api, formatMoney } from '../api.js';

const empty = {
  date: new Date().toISOString().slice(0, 10),
  supplier: '',
  product_id: '',
  item_name: '',
  quantity: 1,
  unit_cost: 0,
  notes: '',
};

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setPurchases(await api.getPurchases());
  }
  useEffect(() => {
    load();
    api.getProducts().then(setProducts);
  }, []);

  function pickProduct(productId) {
    const p = products.find((pr) => String(pr.id) === String(productId));
    if (p) setForm((f) => ({ ...f, product_id: p.id, item_name: p.name }));
    else setForm((f) => ({ ...f, product_id: '', item_name: '' }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.item_name || !form.quantity) {
      setError('El ítem y la cantidad son obligatorios.');
      return;
    }
    try {
      await api.createPurchase({
        ...form,
        product_id: form.product_id || null,
        quantity: Number(form.quantity),
        unit_cost: Number(form.unit_cost || 0),
      });
      setForm(empty);
      setShowForm(false);
      load();
      api.getProducts().then(setProducts);
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm('¿Eliminar esta compra? Esto también descontará la cantidad del inventario del producto asociado.')) return;
    await api.deletePurchase(id);
    load();
    api.getProducts().then(setProducts);
  }

  const total = purchases.reduce((sum, p) => sum + p.total, 0);

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy-900">Compras</h1>
        <button className="btn-primary" onClick={() => { setForm(empty); setShowForm(true); }}>+ Nueva compra</button>
      </div>
      <p className="text-sm text-slate-500">
        Registra aquí lo que compras a tus proveedores. Si seleccionas un producto del inventario, su stock se suma automáticamente.
      </p>

      {showForm && (
        <form onSubmit={submit} className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Fecha</label>
            <input className="input" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Proveedor</label>
            <input className="input" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Producto del inventario (opcional)</label>
            <select className="input" value={form.product_id} onChange={(e) => pickProduct(e.target.value)}>
              <option value="">Ítem manual (no afecta inventario)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — stock actual: {p.track_stock ? p.stock : 'sin control'}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descripción del ítem</label>
            <input className="input" required value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Cantidad comprada</label>
            <input className="input" type="number" step="0.01" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div>
            <label className="label">Costo unitario</label>
            <input className="input" type="number" step="0.01" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notas (opcional)</label>
            <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          <div className="sm:col-span-2 flex gap-2">
            <button className="btn-primary">Guardar compra</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="card">
        <table className="w-full table-base">
          <thead>
            <tr>
              <th>Fecha</th><th>Proveedor</th><th>Ítem</th><th className="text-right">Cantidad</th>
              <th className="text-right">Costo unit.</th><th className="text-right">Total</th><th></th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td>{p.date}</td>
                <td>{p.supplier}</td>
                <td>{p.item_name}</td>
                <td className="text-right font-mono-num">{p.quantity}</td>
                <td className="text-right font-mono-num">{formatMoney(p.unit_cost)}</td>
                <td className="text-right font-mono-num">{formatMoney(p.total)}</td>
                <td className="text-right"><button className="text-red-500 font-semibold hover:underline" onClick={() => remove(p.id)}>Eliminar</button></td>
              </tr>
            ))}
            {purchases.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-6">No hay compras registradas.</td></tr>}
          </tbody>
          {purchases.length > 0 && (
            <tfoot><tr><td colSpan={5} className="text-right font-semibold">Total</td><td className="text-right font-mono-num font-bold">{formatMoney(total)}</td><td /></tr></tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
