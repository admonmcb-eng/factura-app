import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const empty = { name: '', identification: '', address: '', city: '', phone: '', email: '' };

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setSuppliers(await api.getSuppliers(q));
  }
  useEffect(() => { load(); }, [q]);

  async function submit(e) {
    e.preventDefault();
    if (editingId) {
      await api.updateSupplier(editingId, form);
    } else {
      await api.createSupplier(form);
    }
    setForm(empty);
    setEditingId(null);
    setShowForm(false);
    load();
  }

  function edit(s) {
    setForm(s);
    setEditingId(s.id);
    setShowForm(true);
  }

  async function remove(id) {
    if (!confirm('¿Eliminar este proveedor?')) return;
    await api.deleteSupplier(id);
    load();
  }

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy-900">Proveedores</h1>
        <button className="btn-primary" onClick={() => { setForm(empty); setEditingId(null); setShowForm(true); }}>+ Nuevo proveedor</button>
      </div>

      <input className="input max-w-sm" placeholder="Buscar proveedor..." value={q} onChange={(e) => setQ(e.target.value)} />

      {showForm && (
        <form onSubmit={submit} className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label">Nombre</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Identificación / NIT</label><input className="input" value={form.identification || ''} onChange={(e) => setForm({ ...form, identification: e.target.value })} /></div>
          <div><label className="label">Dirección</label><input className="input" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><label className="label">Ciudad</label><input className="input" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><label className="label">Teléfono</label><input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="label">Correo</label><input className="input" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="sm:col-span-2 flex gap-2 pt-2">
            <button className="btn-primary">{editingId ? 'Guardar cambios' : 'Crear proveedor'}</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="card">
        <table className="w-full table-base">
          <thead>
            <tr><th>Nombre</th><th>Identificación</th><th>Ciudad</th><th>Teléfono</th><th></th></tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="font-medium text-navy-900">{s.name}</td>
                <td>{s.identification}</td>
                <td>{s.city}</td>
                <td>{s.phone}</td>
                <td className="text-right space-x-3">
                  <button className="text-teal-600 font-semibold hover:underline" onClick={() => edit(s)}>Editar</button>
                  <button className="text-red-500 font-semibold hover:underline" onClick={() => remove(s.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-6">No hay proveedores registrados.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
