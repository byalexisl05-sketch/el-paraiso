import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'

const navItems = [
  { to: '/compras', icon: '🧾', label: 'Compras' },
  { to: '/dashboard', icon: '◈', label: 'Dashboard' },
  { to: '/ventas',    icon: '🛒', label: 'Ventas' },
  { to: '/gastos',    icon: '💸', label: 'Gastos' },
  { to: '/fiados',    icon: '👥', label: 'Fiados' },
  { to: '/reportes',  icon: '📊', label: 'Reportes' },
]

export default function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100">

      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-56 bg-gray-900 border-r border-gray-800 flex-col sticky top-0 h-screen">
        <div className="p-5 border-b border-gray-800">
          <div className="text-2xl mb-1">🍾</div>
          <div className="font-bold text-white text-sm leading-tight">
            Mini Market<br/>El Paraíso
          </div>
          <div className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Admin</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-yellow-500/10 text-yellow-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800 text-xs text-gray-600">
          <span className="text-green-400">●</span> En línea · v1.0
        </div>
      </aside>

      {/* Layout móvil */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Topbar móvil */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍾</span>
            <div>
              <div className="text-sm font-bold text-white leading-tight">Mini Market El Paraíso</div>
            </div>
          </div>
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors">
            {menuAbierto ? '✕' : '☰'}
          </button>
        </header>

        {/* Menú desplegable móvil */}
        {menuAbierto && (
          <div className="md:hidden bg-gray-900 border-b border-gray-800 z-30">
            <nav className="p-3 space-y-1">
              {navItems.map(item => (
                <NavLink key={item.to} to={item.to}
                  onClick={() => setMenuAbierto(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`
                  }>
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}

        {/* Contenido */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>

        {/* Barra navegación inferior móvil */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-40">
          <div className="flex">
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
                    isActive ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'
                  }`
                }>
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Espacio para la barra inferior en móvil */}
        <div className="md:hidden h-16" />

      </div>
    </div>
  )
}