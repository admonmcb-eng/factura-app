import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatMoney } from '../api.js';
import { StatusBadge } from './Dashboard.jsx';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [filter, setFilter] = useState('todas');
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    api.getInvoices().then(setInvoices);
    api.getClients().then(setClients);
  }, []);

  const filtered = invoices
    .filter((i) => filter === 'todas' || i.status === filter)
    .filter((i) => !clientId || String(i.client_id) === String(clientId));

  const summary = useMemo(() => {
    if (!clientId) return null;
    const clientInvoices = invoices.filter((i) => String(i.client_id) === String(clientId) && i.status !== 'anulada');
    const totalFacturado = clientInvoices.reduce((sum, i) => sum + i.total, 0);
    const totalPagado = clientInvoices.reduce((sum, i) => sum + i.paid_total, 0);
    return {
      totalFacturado,
      totalPagado,
      saldoPendiente: totalFacturado - totalPagado,
      cantidad: clientInvoices.length,
    };
  }, [clientId, invoices]);

  const clientName = clients.find((c) => String(c.id) === String(clientId))?.name;

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy-900">Facturas de venta</h1>
        <Link to="/facturas/nueva" className="btn-primary">+ Nueva factura</Link>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px]">
          <label className="label">Cliente</label>
          <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Todos los clientes</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {summary && (
        <div className="card p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Facturado a {clientName}</div>
            <div className="text-xl font-bold text-navy-900 font-mono-num mt-1">{formatMoney(summary.totalFacturado)}</div>
            <div className="text-xs text-slate-400 mt-1">{summary.cantidad} factura(s)</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pagado</div>
            <div className="text-xl font-bold text-emerald-600 font-mono-num mt-1">{formatMoney(summary.totalPagado)}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Saldo pendiente</div>
            <div className={`text-xl font-bold font-mono-num mt-1 ${summary.saldoPendiente > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {formatMoney(summary.saldoPendiente)}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 text-sm">
        {['todas', 'pendiente', 'parcial', 'pagada', 'vencida', 'anulada'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full font-semibold ${filter === f ? 'bg-navy-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="card">
        <table className="w-full table-base">
          <thead>
            <tr><th>No.</th><th>Cliente</th><th>Expedición</th><th>Vencimiento</th><th>Estado</th><th className="text-right">Total</th><th className="text-right">Saldo</th></tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => (window.location.href = `/facturas/${inv.id}`)}>
                <td className="font-mono-num">{inv.number}</td>
                <td>{inv.client_name}</td>
                <td>{inv.issue_date}</td>
                <td>{inv.due_date}</td>
                <td><StatusBadge status={inv.status} /></td>
                <td className="text-right font-mono-num">{formatMoney(inv.total)}</td>
                <td className="text-right font-mono-num">{formatMoney(inv.total - inv.paid_total)}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-6">No hay facturas para este filtro.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
