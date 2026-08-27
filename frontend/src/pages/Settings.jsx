import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Settings() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [logoError, setLogoError] = useState('');

  useEffect(() => { api.getCompany().then(setForm); }, []);

  async function submit(e) {
    e.preventDefault();
    const updated = await api.updateCompany(form);
    setForm(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');
    if (file.size > 1.5 * 1024 * 1024) {
      setLogoError('La imagen es muy pesada. Usa un logo de menos de 1.5 MB.');
      return;
    }
    const base64 = await fileToBase64(file);
    setForm((f) => ({ ...f, logo_url: base64 }));
  }

  if (!form) return <div className="p-8 text-slate-500">Cargando...</div>;

  return (
    <div className="p-8 max-w-xl space-y-4">
      <h1 className="text-xl font-bold text-navy-900">Datos de la empresa</h1>
      <p className="text-sm text-slate-500">Esta información aparece en el encabezado de tus facturas en PDF.</p>
      <form onSubmit={submit} className="card p-4 space-y-3">
        <div>
          <label className="label">Logo de la empresa</label>
          <div className="flex items-center gap-3">
            {form.logo_url && (
              <img src={form.logo_url} alt="Logo" className="h-14 w-14 object-contain border border-slate-200 rounded-md bg-white" />
            )}
            <div>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} className="text-sm" />
              {form.logo_url && (
                <button type="button" className="block text-xs text-red-500 font-semibold mt-1" onClick={() => setForm({ ...form, logo_url: '' })}>
                  Quitar logo
                </button>
              )}
            </div>
          </div>
          {logoError && <p className="text-xs text-red-600 mt-1">{logoError}</p>}
        </div>
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
