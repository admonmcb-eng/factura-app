import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatMoney } from '../api.js';

function StatCard({ label, value, hint, accent }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-extrabold mt-1 font-mono-num ${accent || 'text-navy-900'}`}>{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [pending, setPending] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [monthReport, setMonthReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      const [p, inv, ie] = await Promise.all([
        api.reportPending(),
        api.getInvoices(),
        api.reportIncomeExpenses(from, to),
      ]);
      setPending(p);
      setInvoices(inv.slice(0, 6));
      setMonthReport(ie);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="p-8 text-slate-500">Cargando...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy-900">Panel general</h1>
        <Link to="/facturas/nueva" className="btn-primary">+ Nueva factura</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Ventas del mes" value={formatMoney(monthReport?.income)} accent="text-teal-600" />
        <StatCard label="Gastos del mes" value={formatMoney(monthReport?.expenses)} hint="Incluye compras" accent="text-red-500" />
        <StatCard
          label="Utilidad del mes"
          value={formatMoney(monthReport?.net)}
          hint="Ventas - gastos y compras"
          accent={monthReport?.net >= 0 ? 'text-emerald-600' : 'text-red-500'}
        />
        <StatCard label="Cartera pendiente" value={formatMoney(pending?.totalPending)} hint={`${pending?.rows.length || 0} facturas por cobrar`} />
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-navy-900 text-sm">Últimas facturas</h2>
          <Link to="/facturas" className="text-teal-600 text-sm font-semibold hover:underline">Ver todas</Link>
        </div>
        <table className="w-full table-base">
          <thead>
            <tr>
              <th>No.</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => (window.location.href = `/facturas/${inv.id}`)}>
                <td className="font-mono-num">{inv.number}</td>
                <td>{inv.client_name}</td>
                <td>{inv.issue_date}</td>
                <td><StatusBadge status={inv.status} /></td>
                <td className="text-right font-mono-num">{formatMoney(inv.total)}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan={5} className="text-center text-slate-400 py-6">Aún no hay facturas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    pendiente: 'bg-amber-100 text-amber-700',
    parcial: 'bg-blue-100 text-blue-700',
    pagada: 'bg-emerald-100 text-emerald-700',
    vencida: 'bg-red-100 text-red-700',
    anulada: 'bg-slate-200 text-slate-500',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
}
