import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatMoney } from '../api.js';

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function InvoiceForm() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [clientId, setClientId] = useState('');
  const [issueDate, setIssueDate] = useState(todayPlus(0));
  const [dueDate, setDueDate] = useState(todayPlus(0));
  const [taxRate, setTaxRate] = useState(0);
  const [items, setItems] = useState([{ product_id: '', item_name: '', price: 0, quantity: 1, discount: 0 }]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getClients().then(setClients);
    api.getProducts().then(setProducts);
  }, []);

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function pickProduct(idx, productId) {
    const p = products.find((pr) => String(pr.id) === String(productId));
    if (p) updateItem(idx, { product_id: p.id, item_name: p.name, price: p.price });
    else updateItem(idx, { product_id: '', item_name: '' });
  }

  function addItem() {
    setItems((prev) => [...prev, { product_id: '', item_name: '', price: 0, quantity: 1, discount: 0 }]);
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const subtotal = items.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0), 0);
  const discountTotal = items.reduce((sum, it) => sum + Number(it.discount || 0), 0);
  const taxTotal = ((subtotal - discountTotal) * Number(taxRate || 0)) / 100;
  const total = subtotal - discountTotal + taxTotal;

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!clientId) return setError('Selecciona un cliente.');
    if (!items.length || items.some((it) => !it.item_name || !it.quantity)) {
      return setError('Cada ítem necesita nombre y cantidad.');
    }
    setSaving(true);
    try {
      const invoice = await api.createInvoice({
        client_id: Number(clientId),
        issue_date: issueDate,
        due_date: dueDate,
        tax_rate: Number(taxRate || 0),
        notes,
        items: items.map((it) => ({
          product_id: it.product_id || null,
          item_name: it.item_name,
          price: Number(it.price || 0),
          quantity: Number(it.quantity || 0),
          discount: Number(it.discount || 0),
        })),
      });
      navigate(`/facturas/${invoice.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl space-y-4">
      <h1 className="text-xl font-bold text-navy-900">Nueva factura de venta</h1>

      <form onSubmit={submit} className="space-y-4">
        <div className="card p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="label">Cliente</label>
            <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              <option value="">Selecciona un cliente...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Fecha de expedición</label>
            <input className="input" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">Fecha de vencimiento</label>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-navy-900 text-sm">Ítems</h2>
            <button type="button" className="btn-secondary text-xs" onClick={addItem}>+ Agregar ítem</button>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end border-b border-slate-100 pb-2">
                <div className="col-span-4">
                  <label className="label">Producto (opcional)</label>
                  <select className="input" value={it.product_id} onChange={(e) => pickProduct(idx, e.target.value)}>
                    <option value="">Ítem manual</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="label">Descripción</label>
                  <input className="input" required value={it.item_name} onChange={(e) => updateItem(idx, { item_name: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="label">Precio</label>
                  <input className="input" type="number" step="0.01" value={it.price} onChange={(e) => updateItem(idx, { price: e.target.value })} />
                </div>
                <div className="col-span-1">
                  <label className="label">Cant.</label>
                  <input className="input" type="number" step="0.01" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} />
                </div>
                <div className="col-span-1">
                  <label className="label">Desc.</label>
                  <input className="input" type="number" step="0.01" value={it.discount} onChange={(e) => updateItem(idx, { discount: e.target.value })} />
                </div>
                <div className="col-span-1 text-right">
                  <button type="button" className="text-red-500 text-xs font-semibold" onClick={() => removeItem(idx)}>Quitar</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Notas (opcional)</label>
            <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-mono-num">{formatMoney(subtotal)}</span></div>
            <div className="flex justify-between items-center">
              <span>Descuento</span><span className="font-mono-num">{formatMoney(discountTotal)}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span>Impuesto (%)</span>
              <input className="input w-20 text-right" type="number" step="0.1" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </div>
            <div className="flex justify-between font-bold text-navy-900 border-t border-slate-200 pt-2">
              <span>Total</span><span className="font-mono-num">{formatMoney(total)}</span>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar y generar factura'}</button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/facturas')}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
