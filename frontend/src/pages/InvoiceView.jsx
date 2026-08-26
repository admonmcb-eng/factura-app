import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, formatMoney } from '../api.js';
import { StatusBadge } from './Dashboard.jsx';

export default function InvoiceView() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('efectivo');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');

  async function load() {
    setInvoice(await api.getInvoice(id));
  }
  useEffect(() => { load(); }, [id]);

  async function submitPayment(e) {
    e.preventDefault();
    setError('');
    try {
      await api.addPayment({ invoice_id: Number(id), amount: Number(payAmount), method: payMethod, paid_at: payDate });
      setPayAmount('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function voidInvoice() {
    if (!confirm('¿Anular esta factura?')) return;
    await api.voidInvoice(id);
    load();
  }

  if (!invoice) return <div className="p-8 text-slate-500">Cargando...</div>;

  const balance = invoice.total - invoice.paid_total;

  return (
    <div className="p-8 max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Factura No. {invoice.number}</h1>
          <div className="mt-1"><StatusBadge status={invoice.status} /></div>
        </div>
        <div className="flex gap-2">
          <a href={api.invoicePdfUrl(invoice.id)} target="_blank" rel="noreferrer" className="btn-primary">Descargar PDF</a>
          {invoice.status !== 'anulada' && <button onClick={voidInvoice} className="btn-secondary">Anular</button>}
        </div>
      </div>

      <div className="card p-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="label">Cliente</div>
          <div className="font-medium text-navy-900">{invoice.client?.name}</div>
          <div className="text-slate-500">{invoice.client?.identification}</div>
          <div className="text-slate-500">{invoice.client?.address}, {invoice.client?.city}</div>
        </div>
        <div className="text-right">
          <div className="label">Expedición</div>
          <div>{invoice.issue_date}</div>
          <div className="label mt-2">Vencimiento</div>
          <div>{invoice.due_date}</div>
        </div>
      </div>

      <div className="card">
        <table className="w-full table-base">
          <thead><tr><th>Ítem</th><th className="text-right">Precio</th><th className="text-right">Cant.</th><th className="text-right">Desc.</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            {invoice.items.map((it) => (
              <tr key={it.id}>
                <td>{it.item_name}</td>
                <td className="text-right font-mono-num">{formatMoney(it.price)}</td>
                <td className="text-right font-mono-num">{it.quantity}</td>
                <td className="text-right font-mono-num">{it.discount ? formatMoney(it.discount) : '—'}</td>
                <td className="text-right font-mono-num">{formatMoney(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 flex justify-end">
          <div className="w-56 text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-mono-num">{formatMoney(invoice.subtotal)}</span></div>
            {invoice.discount_total > 0 && <div className="flex justify-between"><span>Descuento</span><span className="font-mono-num">{formatMoney(invoice.discount_total)}</span></div>}
            {invoice.tax_total > 0 && <div className="flex justify-between"><span>Impuestos</span><span className="font-mono-num">{formatMoney(invoice.tax_total)}</span></div>}
            <div className="flex justify-between font-bold text-navy-900 border-t border-slate-200 pt-1"><span>Total</span><span className="font-mono-num">{formatMoney(invoice.total)}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Pagado</span><span className="font-mono-num">{formatMoney(invoice.paid_total)}</span></div>
            <div className="flex justify-between font-semibold"><span>Saldo</span><span className="font-mono-num">{formatMoney(balance)}</span></div>
          </div>
        </div>
      </div>

      {invoice.status !== 'anulada' && balance > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold text-navy-900 text-sm mb-3">Registrar abono / pago</h2>
          <form onSubmit={submitPayment} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="label">Monto</label>
              <input className="input" type="number" step="0.01" max={balance} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
            </div>
            <div>
              <label className="label">Método</label>
              <select className="input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} required />
            </div>
            <button className="btn-primary">Registrar pago</button>
          </form>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
      )}

      {invoice.payments?.length > 0 && (
        <div className="card">
          <div className="px-4 py-2 border-b border-slate-200 font-semibold text-navy-900 text-sm">Historial de pagos</div>
          <table className="w-full table-base">
            <thead><tr><th>Fecha</th><th>Método</th><th className="text-right">Monto</th></tr></thead>
            <tbody>
              {invoice.payments.map((p) => (
                <tr key={p.id}><td>{p.paid_at}</td><td>{p.method}</td><td className="text-right font-mono-num">{formatMoney(p.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Link to="/facturas" className="text-teal-600 text-sm font-semibold hover:underline">← Volver a facturas</Link>
    </div>
  );
}
