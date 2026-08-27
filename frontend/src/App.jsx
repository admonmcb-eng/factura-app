import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Clients from './pages/Clients.jsx';
import Suppliers from './pages/Suppliers.jsx';
import Products from './pages/Products.jsx';
import Invoices from './pages/Invoices.jsx';
import InvoiceForm from './pages/InvoiceForm.jsx';
import InvoiceView from './pages/InvoiceView.jsx';
import Expenses from './pages/Expenses.jsx';
import Purchases from './pages/Purchases.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';

function useAuth() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  return { user, setUser };
}

const navItems = [
  { to: '/', label: 'Panel', icon: '◧' },
  { to: '/facturas', label: 'Facturas', icon: '▤' },
  { to: '/clientes', label: 'Clientes', icon: '◍' },
  { to: '/proveedores', label: 'Proveedores', icon: '◈' },
  { to: '/productos', label: 'Productos', icon: '◫' },
  { to: '/compras', label: 'Compras', icon: '▼' },
  { to: '/gastos', label: 'Gastos', icon: '◒' },
  { to: '/reportes', label: 'Reportes', icon: '◔' },
  { to: '/configuracion', label: 'Empresa', icon: '⚙' },
];

function Shell({ user, onLogout, children }) {
  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="w-60 bg-navy-900 text-slate-200 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="text-lg font-extrabold text-white tracking-tight">Contafácil</div>
          <div className="text-xs text-slate-400 mt-0.5">Contabilidad y facturación</div>
        </div>
        <nav className="flex-1 py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-teal-500/15 text-teal-400 border-r-2 border-teal-500' : 'text-slate-300 hover:bg-white/5'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-white/10 text-xs text-slate-400">
          <div className="font-semibold text-slate-200">{user?.name}</div>
          <div className="truncate">{user?.email}</div>
          <button onClick={onLogout} className="mt-2 text-teal-400 hover:text-teal-300 font-semibold">
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

export default function App() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  function handleLogin(u, token) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    navigate('/');
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login onLogin={handleLogin} />} />
      </Routes>
    );
  }

  return (
    <Shell user={user} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/facturas" element={<Invoices />} />
        <Route path="/facturas/nueva" element={<InvoiceForm />} />
        <Route path="/facturas/:id" element={<InvoiceView />} />
        <Route path="/clientes" element={<Clients />} />
        <Route path="/proveedores" element={<Suppliers />} />
        <Route path="/productos" element={<Products />} />
        <Route path="/compras" element={<Purchases />} />
        <Route path="/gastos" element={<Expenses />} />
        <Route path="/reportes" element={<Reports />} />
        <Route path="/configuracion" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
