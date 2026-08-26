import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatMoney } from '../api.js';
import { StatusBadge } from './Dashboard.jsx';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState('todas');

  useEffect(() => { api.getInvoices().then(setInvoices); }, []);

  const filtered = filter === 'todas' ? invoices : invoices.filter((i) => i.status === filter);

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy-900">Facturas de venta</h1>
        <Link to="/facturas/nueva" className="btn-primary">+ Nueva factura</Link>
      </div>

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
            <tr><th>No.</th><th>Cliente</th><th>Expedición</th><th>Vencimiento</th><th>Estado</th><th className="text-right">Total</th></tr>
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
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-6">No hay facturas para este filtro.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
