import { Outlet, NavLink } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', icon: '◈', label: 'Dashboard' },
  { to: '/ventas',    icon: '🛒', label: 'Ventas' },
  { to: '/gastos',    icon: '💸', label: 'Gastos' },
  { to: '/fiados',    icon: '👥', label: 'Fiados' },
  { to: '/reportes',  icon: '📊', label: 'Reportes' },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100">

      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-gray-800">
          <div className="text-2xl mb-1">🍾</div>
          <div className="font-bold text-white text-sm leading-tight">
            Mini Market<br/>El Paraíso
          </div>
          <div className="text-xs text-gray-500 mt-1 uppercase tracking-widest">
            Admin
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-yellow-500/10 text-yellow-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 text-xs text-gray-600">
          <span className="text-green-400">●</span> En línea · v1.0
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

    </div>
  )
}