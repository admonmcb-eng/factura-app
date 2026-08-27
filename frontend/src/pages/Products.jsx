import React, { useEffect, useState } from 'react';
import { api, formatMoney } from '../api.js';

const empty = { name: '', unit: 'Unidad', price: 0, cost: 0, stock: 0, track_stock: false, category: '' };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setProducts(await api.getProducts(q));
  }
  useEffect(() => { load(); }, [q]);

  async function submit(e) {
    e.preventDefault();
    const payload = { ...form, price: Number(form.price), cost: Number(form.cost || 0), stock: Number(form.stock) };
    if (editingId) await api.updateProduct(editingId, payload);
    else await api.createProduct(payload);
    setForm(empty);
    setEditingId(null);
    setShowForm(false);
    load();
  }

  function edit(p) {
    setForm({ ...p, track_stock: !!p.track_stock });
    setEditingId(p.id);
    setShowForm(true);
  }

  async function remove(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    await api.deleteProduct(id);
    load();
  }

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy-900">Productos y servicios</h1>
        <button className="btn-primary" onClick={() => { setForm(empty); setEditingId(null); setShowForm(true); }}>+ Nuevo producto</button>
      </div>

      <input className="input max-w-sm" placeholder="Buscar producto..." value={q} onChange={(e) => setQ(e.target.value)} />

      {showForm && (
        <form onSubmit={submit} className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label">Nombre</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Categoría</label><input className="input" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div><label className="label">Precio de venta</label><input className="input" type="number" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
          <div><label className="label">Costo (última compra)</label><input className="input" type="number" step="0.01" value={form.cost || 0} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
          <div><label className="label">Unidad de medida</label><input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
          <div className="flex items-center gap-2 pt-6">
            <input id="track" type="checkbox" checked={form.track_stock} onChange={(e) => setForm({ ...form, track_stock: e.target.checked })} />
            <label htmlFor="track" className="text-sm text-slate-600">Controlar inventario</label>
          </div>
          {form.track_stock && (
            <div><label className="label">Stock disponible</label><input className="input" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
          )}
          <div className="sm:col-span-2 flex gap-2 pt-2">
            <button className="btn-primary">{editingId ? 'Guardar cambios' : 'Crear producto'}</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="card">
        <table className="w-full table-base">
          <thead>
            <tr><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Costo</th><th>Stock</th><th></th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="font-medium text-navy-900">{p.name}</td>
                <td>{p.category}</td>
                <td className="font-mono-num">{formatMoney(p.price)}</td>
                <td className="font-mono-num text-slate-500">{formatMoney(p.cost)}</td>
                <td>{p.track_stock ? p.stock : '—'}</td>
                <td className="text-right space-x-3">
                  <button className="text-teal-600 font-semibold hover:underline" onClick={() => edit(p)}>Editar</button>
                  <button className="text-red-500 font-semibold hover:underline" onClick={() => remove(p.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-6">No hay productos registrados.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
