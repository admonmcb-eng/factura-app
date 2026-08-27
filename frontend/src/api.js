const BASE = '/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('No autenticado');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error en la solicitud');
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  getCompany: () => request('/company'),
  updateCompany: (data) => request('/company', { method: 'PUT', body: JSON.stringify(data) }),

  getClients: (q) => request(`/clients${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getClient: (id) => request(`/clients/${id}`),
  createClient: (data) => request('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id, data) => request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id) => request(`/clients/${id}`, { method: 'DELETE' }),

  getProducts: (q) => request(`/products${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  getInvoices: () => request('/invoices'),
  getInvoice: (id) => request(`/invoices/${id}`),
  createInvoice: (data) => request('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  voidInvoice: (id) => request(`/invoices/${id}/void`, { method: 'POST' }),
  invoicePdfUrl: (id) => `${BASE}/invoices/${id}/pdf?token=${encodeURIComponent(localStorage.getItem('token') || '')}`,

  addPayment: (data) => request('/payments', { method: 'POST', body: JSON.stringify(data) }),

  getExpenses: (from, to) => request(`/expenses${from && to ? `?from=${from}&to=${to}` : ''}`),
  createExpense: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

  getPurchases: (from, to) => request(`/purchases${from && to ? `?from=${from}&to=${to}` : ''}`),
  createPurchase: (data) => request('/purchases', { method: 'POST', body: JSON.stringify(data) }),
  deletePurchase: (id) => request(`/purchases/${id}`, { method: 'DELETE' }),

  reportSales: (from, to) => request(`/reports/sales?from=${from}&to=${to}`),
  reportPending: () => request('/reports/pending'),
  reportIncomeExpenses: (from, to) => request(`/reports/income-vs-expenses?from=${from}&to=${to}`),
};

export function formatMoney(n) {
  return `$${Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
