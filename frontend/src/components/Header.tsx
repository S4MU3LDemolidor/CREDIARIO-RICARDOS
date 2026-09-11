import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Header() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-gray-900">
          {profile?.lojas?.nome ?? 'Crediário'}
        </span>
        {profile && (
          <span className="text-gray-400 text-sm">{profile.nome}</span>
        )}
      </div>
      <nav className="flex items-center gap-5">
        <Link
          to="/historico"
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Histórico
        </Link>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Sair
        </button>
      </nav>
    </header>
  )
}
