import { Link, useLocation } from 'react-router-dom'

function NavLink({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation()
  const active = pathname === to
  return (
    <Link
      to={to}
      className={`block w-full px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? 'bg-[#fef2f2] text-[#aa0000] font-semibold'
          : 'text-[#374151] hover:bg-[#f3f4f6] hover:text-[#111827]'
      }`}
    >
      {label}
    </Link>
  )
}

export function Sidebar() {
  return (
    <aside className="w-[160px] shrink-0 overflow-y-auto py-5 px-3">
      <p className="px-3 text-xs font-semibold text-[#111827] mb-2">Menu</p>
      <div className="space-y-0.5">
        <NavLink to="/" label="Consulta" />
        <NavLink to="/historico" label="Histórico" />
      </div>
    </aside>
  )
}
