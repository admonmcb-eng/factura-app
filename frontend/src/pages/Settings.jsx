import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Settings() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.getCompany().then(setForm); }, []);

  async function submit(e) {
    e.preventDefault();
    const updated = await api.updateCompany(form);
    setForm(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!form) return <div className="p-8 text-slate-500">Cargando...</div>;

  return (
    <div className="p-8 max-w-xl space-y-4">
      <h1 className="text-xl font-bold text-navy-900">Datos de la empresa</h1>
      <p className="text-sm text-slate-500">Esta información aparece en el encabezado de tus facturas en PDF.</p>
      <form onSubmit={submit} className="card p-4 space-y-3">
        <div><label className="label">Nombre de la empresa</label><input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">NIT</label><input className="input" value={form.nit || ''} onChange={(e) => setForm({ ...form, nit: e.target.value })} /></div>
          <div><label className="label">Moneda</label><input className="input" value={form.currency || ''} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
        </div>
        <div><label className="label">Dirección</label><input className="input" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Ciudad</label><input className="input" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><label className="label">Teléfono</label><input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        </div>
        <div><label className="label">Correo</label><input className="input" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><label className="label">Tarifa de impuesto por defecto (%)</label><input className="input" type="number" step="0.1" value={form.tax_rate || 0} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })} /></div>
        <button className="btn-primary">Guardar cambios</button>
        {saved && <span className="text-teal-600 text-sm font-semibold ml-2">Guardado ✓</span>}
      </form>
    </div>
  );
}
