import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Header() {
  const { profile, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  function navClass(path: string) {
    const active = location.pathname === path
    return `text-sm transition-colors ${
      active
        ? 'text-[#111] font-medium border-b border-[#111] pb-0.5'
        : 'text-[#999] hover:text-[#111]'
    }`
  }

  return (
    <header className="bg-white border-b border-[#e5e5e5] px-6 py-4 flex items-center justify-between gap-4">
      <Link to="/" className="flex items-center gap-3 shrink-0">
        <span className="font-sans text-accent text-sm font-semibold tracking-[0.15em] uppercase">
          CREDIÁRIO
        </span>
        {profile?.lojas?.nome && (
          <>
            <span className="text-[#e5e5e5] select-none">·</span>
            <span className="text-[#999] text-sm font-light">
              {profile.lojas.nome}
            </span>
          </>
        )}
      </Link>

      <nav className="flex items-center gap-6">
        <Link to="/" className={navClass('/')}>Consulta</Link>
        <Link to="/historico" className={navClass('/historico')}>Histórico</Link>
        {profile && (
          <span className="text-[#bbb] text-sm hidden sm:block">{profile.nome}</span>
        )}
        <button
          onClick={handleSignOut}
          className="text-sm text-[#999] hover:text-[#111] transition-colors"
        >
          Sair
        </button>
      </nav>
    </header>
  )
}
