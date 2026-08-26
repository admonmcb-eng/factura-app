import React, { useState } from 'react';
import { api, formatMoney } from '../api.js';

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

function toCsv(rows, columns) {
  const header = columns.map((c) => c.label).join(',');
  const body = rows.map((r) => columns.map((c) => `"${(r[c.key] ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
  return `${header}\n${body}`;
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [{ from, to }, setRange] = useState(monthRange());
  const [sales, setSales] = useState(null);
  const [pending, setPending] = useState(null);
  const [ie, setIe] = useState(null);
  const [tab, setTab] = useState('ventas');

  async function loadAll(range = { from, to }) {
    const [s, p, i] = await Promise.all([
      api.reportSales(range.from, range.to),
      api.reportPending(),
      api.reportIncomeExpenses(range.from, range.to),
    ]);
    setSales(s); setPending(p); setIe(i);
  }

  React.useEffect(() => { loadAll(); }, []);

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-xl font-bold text-navy-900">Reportes</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div><label className="label">Desde</label><input className="input" type="date" value={from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /></div>
        <div><label className="label">Hasta</label><input className="input" type="date" value={to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></div>
        <button className="btn-primary" onClick={() => loadAll({ from, to })}>Aplicar</button>
      </div>

      <div className="flex gap-2 text-sm">
        {[['ventas', 'Ventas'], ['cartera', 'Cartera pendiente'], ['balance', 'Ingresos vs. gastos']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-3 py-1 rounded-full font-semibold ${tab === key ? 'bg-navy-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{label}</button>
        ))}
      </div>

      {tab === 'ventas' && sales && (
        <div className="card">
          <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <div className="text-sm">Total del periodo: <span className="font-mono-num font-bold">{formatMoney(sales.total)}</span></div>
            <button className="btn-secondary text-xs" onClick={() => downloadCsv('ventas.csv', toCsv(sales.rows, [
              { key: 'number', label: 'No.' }, { key: 'client_name', label: 'Cliente' }, { key: 'issue_date', label: 'Fecha' }, { key: 'total', label: 'Total' }, { key: 'status', label: 'Estado' },
            ]))}>Exportar CSV</button>
          </div>
          <table className="w-full table-base">
            <thead><tr><th>No.</th><th>Cliente</th><th>Fecha</th><th>Estado</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {sales.rows.map((r) => (
                <tr key={r.id}><td className="font-mono-num">{r.number}</td><td>{r.client_name}</td><td>{r.issue_date}</td><td>{r.status}</td><td className="text-right font-mono-num">{formatMoney(r.total)}</td></tr>
              ))}
              {sales.rows.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-6">Sin ventas en el periodo.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'cartera' && pending && (
        <div className="card">
          <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <div className="text-sm">Total por cobrar: <span className="font-mono-num font-bold">{formatMoney(pending.totalPending)}</span></div>
            <button className="btn-secondary text-xs" onClick={() => downloadCsv('cartera.csv', toCsv(pending.rows, [
              { key: 'number', label: 'No.' }, { key: 'client_name', label: 'Cliente' }, { key: 'due_date', label: 'Vencimiento' }, { key: 'total', label: 'Total' }, { key: 'paid_total', label: 'Pagado' },
            ]))}>Exportar CSV</button>
          </div>
          <table className="w-full table-base">
            <thead><tr><th>No.</th><th>Cliente</th><th>Vencimiento</th><th className="text-right">Total</th><th className="text-right">Saldo</th></tr></thead>
            <tbody>
              {pending.rows.map((r) => (
                <tr key={r.id}><td className="font-mono-num">{r.number}</td><td>{r.client_name}</td><td>{r.due_date}</td><td className="text-right font-mono-num">{formatMoney(r.total)}</td><td className="text-right font-mono-num">{formatMoney(r.total - r.paid_total)}</td></tr>
              ))}
              {pending.rows.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-6">No hay cartera pendiente.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'balance' && ie && (
        <div className="card p-6 grid grid-cols-3 gap-4 text-center">
          <div><div className="label">Ingresos</div><div className="text-xl font-bold text-teal-600 font-mono-num">{formatMoney(ie.income)}</div></div>
          <div><div className="label">Gastos</div><div className="text-xl font-bold text-red-500 font-mono-num">{formatMoney(ie.expenses)}</div></div>
          <div><div className="label">Neto</div><div className="text-xl font-bold text-navy-900 font-mono-num">{formatMoney(ie.net)}</div></div>
        </div>
      )}
    </div>
  );
}
