import React, { useEffect, useState } from 'react';
import { api, formatMoney } from '../api.js';

const empty = { date: new Date().toISOString().slice(0, 10), supplier: '', category: '', amount: '', description: '' };

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setExpenses(await api.getExpenses());
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    await api.createExpense({ ...form, amount: Number(form.amount) });
    setForm(empty);
    setShowForm(false);
    load();
  }

  async function remove(id) {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await api.deleteExpense(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy-900">Gastos</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nuevo gasto</button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label">Fecha</label><input className="input" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div><label className="label">Monto</label><input className="input" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div><label className="label">Proveedor</label><input className="input" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
          <div><label className="label">Categoría</label><input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Descripción</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="sm:col-span-2 flex gap-2">
            <button className="btn-primary">Guardar gasto</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="card">
        <table className="w-full table-base">
          <thead><tr><th>Fecha</th><th>Proveedor</th><th>Categoría</th><th>Descripción</th><th className="text-right">Monto</th><th></th></tr></thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td>{e.date}</td><td>{e.supplier}</td>
                <td>
                  {e.category}
                  {e.purchase_id && <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Compra</span>}
                </td>
                <td>{e.description}</td>
                <td className="text-right font-mono-num">{formatMoney(e.amount)}</td>
                <td className="text-right">
                  {!e.purchase_id && <button className="text-red-500 font-semibold hover:underline" onClick={() => remove(e.id)}>Eliminar</button>}
                </td>
              </tr>
            ))}
            {expenses.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-6">No hay gastos registrados.</td></tr>}
          </tbody>
          {expenses.length > 0 && (
            <tfoot><tr><td colSpan={4} className="text-right font-semibold">Total</td><td className="text-right font-mono-num font-bold">{formatMoney(total)}</td><td /></tr></tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
