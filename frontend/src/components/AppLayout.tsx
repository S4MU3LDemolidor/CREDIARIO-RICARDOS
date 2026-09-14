import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Sidebar } from './Sidebar'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const initials = profile?.nome
    ? profile.nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
    : '?'

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="h-screen flex flex-col bg-[#f9fafb]">

      {/* Top nav — fundo full-width, conteúdo centralizado no mesmo eixo do body */}
      <header className="h-14 shrink-0 z-10">
        <div className="h-full max-w-5xl mx-auto px-6 flex items-center gap-4">
          <Link to="/" className="shrink-0">
            <img src="/logo.png" alt="Crediário" className="h-7 w-auto" />
          </Link>

          <div className="flex-1" />

          {profile?.lojas?.nome && (
            <span className="text-xs text-[#9ca3af] hidden sm:block">{profile.lojas.nome}</span>
          )}

          <button
            onClick={handleSignOut}
            className="text-xs text-[#6b7280] hover:text-[#111827] transition-colors"
          >
            Sair
          </button>

          <div className="w-8 h-8 rounded-full bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-[#6b7280]">{initials}</span>
          </div>
        </div>
      </header>

      {/* Body — sidebar + main centrados juntos */}
      <div className="flex-1 min-h-0 flex justify-center">
        <div className="flex w-full max-w-5xl">
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
        </div>
      </div>

    </div>
  )
}
