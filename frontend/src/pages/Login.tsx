import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const { signIn, session } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  if (session) {
    navigate('/', { replace: true })
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const err = await signIn(email, password)
    setLoading(false)
    if (err) setError('E-mail ou senha inválidos.')
    else navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-up">

        {/* Brand */}
        <div className="mb-10 flex items-center gap-3">
          <div className="w-1 h-8 bg-[#aa0000] rounded-full" />
          <div>
            <h1 className="font-bold text-2xl text-[#111827] tracking-tight leading-none">
              CREDI<span className="text-[#aa0000]">ÁRIO</span>
            </h1>
            <p className="text-[10px] text-[#ccc] font-mono tracking-wider mt-1 uppercase">
              Sistema de Análise de Crédito
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white border border-[#e8e8e8] rounded-2xl p-7 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] font-semibold text-[#bbb] uppercase tracking-[0.15em] mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="voce@loja.com"
                className="w-full bg-[#f8f8f8] border border-[#eee] rounded-lg px-4 py-2.5 text-sm text-[#111]
                           placeholder:text-[#ccc] focus:outline-none focus:border-[#ccc] transition-colors"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-semibold text-[#bbb] uppercase tracking-[0.15em] mb-1.5">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-[#f8f8f8] border border-[#eee] rounded-lg px-4 py-2.5 text-sm text-[#111]
                           focus:outline-none focus:border-[#ccc] transition-colors"
              />
            </div>
          </div>

          {error && (
            <p className="text-[#aa0000] text-xs px-3 py-2 bg-[#fef2f2] border border-[#fca5a5] rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#111] text-white py-3 rounded-lg text-sm font-semibold
                       hover:bg-[#333] disabled:opacity-40 transition-colors tracking-wide mt-1"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>

      </div>
    </div>
  )
}
