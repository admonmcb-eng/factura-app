import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const empty = { name: '', identification: '', address: '', city: '', phone: '', email: '' };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setClients(await api.getClients(q));
  }
  useEffect(() => { load(); }, [q]);

  async function submit(e) {
    e.preventDefault();
    if (editingId) {
      await api.updateClient(editingId, form);
    } else {
      await api.createClient(form);
    }
    setForm(empty);
    setEditingId(null);
    setShowForm(false);
    load();
  }

  function edit(c) {
    setForm(c);
    setEditingId(c.id);
    setShowForm(true);
  }

  async function remove(id) {
    if (!confirm('¿Eliminar este cliente?')) return;
    await api.deleteClient(id);
    load();
  }

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy-900">Clientes</h1>
        <button className="btn-primary" onClick={() => { setForm(empty); setEditingId(null); setShowForm(true); }}>+ Nuevo cliente</button>
      </div>

      <input className="input max-w-sm" placeholder="Buscar por nombre o identificación..." value={q} onChange={(e) => setQ(e.target.value)} />

      {showForm && (
        <form onSubmit={submit} className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label">Nombre / Razón social</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Identificación</label><input className="input" value={form.identification || ''} onChange={(e) => setForm({ ...form, identification: e.target.value })} /></div>
          <div><label className="label">Dirección</label><input className="input" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><label className="label">Ciudad</label><input className="input" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><label className="label">Teléfono</label><input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="label">Correo</label><input className="input" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="sm:col-span-2 flex gap-2 pt-2">
            <button className="btn-primary">{editingId ? 'Guardar cambios' : 'Crear cliente'}</button>
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
            {clients.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="font-medium text-navy-900">{c.name}</td>
                <td>{c.identification}</td>
                <td>{c.city}</td>
                <td>{c.phone}</td>
                <td className="text-right space-x-3">
                  <button className="text-teal-600 font-semibold hover:underline" onClick={() => edit(c)}>Editar</button>
                  <button className="text-red-500 font-semibold hover:underline" onClick={() => remove(c.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {clients.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-6">No hay clientes registrados.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
