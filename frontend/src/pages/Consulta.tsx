import { useState } from 'react'
import { Header } from '../components/Header'
import { Spinner } from '../components/Spinner'
import { VeredittoBadge, scoreColor, scoreBg } from '../components/Badge'
import { ForcarNovaModal } from '../components/ForcarNovaModal'
import { useConsulta } from '../hooks/useConsulta'
import { formatCPF, stripCPF, isValidCPF, formatDate } from '../lib/formatters'
import { ResultadoOk } from '../types'

function ResultadoOkView({
  data,
  onNova,
  onForcarNova,
}: {
  data: ResultadoOk
  onNova: () => void
  onForcarNova: () => void
}) {
  return (
    <div className={`border rounded-xl p-6 space-y-5 ${scoreBg(data.score)}`}>
      {data.cache_hit && (
        <div className="bg-yellow-100 border border-yellow-300 rounded-lg px-4 py-3 text-sm text-yellow-800 flex items-start justify-between gap-3">
          <span>
            Resultado de consulta anterior —{' '}
            {data.cache_data ? formatDate(data.cache_data) : ''} — sem nova cobrança
          </span>
          <button
            onClick={onForcarNova}
            className="shrink-0 text-xs font-medium text-yellow-900 underline"
          >
            Forçar nova consulta
          </button>
        </div>
      )}

      <div className="text-center py-4">
        <p className={`text-8xl font-bold tabular-nums ${scoreColor(data.score)}`}>
          {data.score}
        </p>
        <p className="text-gray-500 text-sm mt-2">Score de crédito (0–1000)</p>
        {data.faixa && (
          <p className="text-gray-500 text-sm mt-1">{data.faixa}</p>
        )}
      </div>

      <div className="flex justify-center">
        <VeredittoBadge veredito={data.veredito} />
      </div>

      <div className="text-center pt-2">
        <button
          onClick={onNova}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          Nova consulta
        </button>
      </div>
    </div>
  )
}

export function Consulta() {
  const [cpfDisplay, setCpfDisplay]           = useState('')
  const [documentoConferido, setDocumento]    = useState(false)
  const [showForcarModal, setShowForcarModal] = useState(false)
  const { state, consultar, reset }           = useConsulta()

  const cpfDigits = stripCPF(cpfDisplay)
  const cpfValido = isValidCPF(cpfDisplay)

  function handleCPFChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCpfDisplay(formatCPF(e.target.value))
  }

  function handleConsultar() {
    if (!cpfValido || !documentoConferido) return
    consultar(cpfDigits, documentoConferido)
  }

  function handleForcarNova(motivo: string) {
    setShowForcarModal(false)
    consultar(cpfDigits, documentoConferido, motivo)
  }

  function handleNova() {
    setCpfDisplay('')
    setDocumento(false)
    reset()
  }

  const isIdle    = state.status === 'idle'
  const isLoading = state.status === 'loading'
  const showForm  = isIdle || isLoading

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-lg mx-auto px-4 py-10 space-y-4">
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Consulta de Crédito</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPF do cliente
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpfDisplay}
                onChange={handleCPFChange}
                maxLength={14}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={documentoConferido}
                onChange={e => setDocumento(e.target.checked)}
                className="mt-0.5 accent-blue-600"
              />
              <span className="text-sm text-gray-700">
                Documento do cliente conferido
              </span>
            </label>

            <button
              onClick={handleConsultar}
              disabled={!cpfValido || !documentoConferido || isLoading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium
                         hover:bg-blue-700 disabled:opacity-50 transition-colors
                         flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><Spinner size="sm" /> Consultando...</>
              ) : (
                'Consultar'
              )}
            </button>
          </div>
        )}

        {state.status === 'resultado' && (() => {
          const { data } = state

          if (data.tipo === 'cpf_nao_encontrado') {
            return (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center space-y-3">
                <div className="text-3xl">🔍</div>
                <h3 className="font-semibold text-blue-900">CPF não localizado</h3>
                <p className="text-sm text-blue-700">Seguir para análise manual.</p>
                <button
                  onClick={handleNova}
                  className="text-sm text-blue-600 underline hover:text-blue-800"
                >
                  Nova consulta
                </button>
              </div>
            )
          }

          if (data.tipo === 'erro_sistema') {
            return (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-8 text-center space-y-3">
                <div className="text-3xl">⚠️</div>
                <h3 className="font-semibold text-orange-900">Consulta indisponível</h3>
                <p className="text-sm text-orange-700">
                  Tente novamente. Se o problema persistir, verifique o saldo da conta.
                </p>
                <details className="text-left text-xs text-orange-500 mt-2">
                  <summary className="cursor-pointer">Detalhes técnicos</summary>
                  <p className="mt-1 font-mono">{data.motivo}</p>
                </details>
                <button
                  onClick={handleNova}
                  className="text-sm text-orange-600 underline hover:text-orange-800"
                >
                  Tentar novamente
                </button>
              </div>
            )
          }

          // data.tipo === 'ok'
          return (
            <ResultadoOkView
              data={data}
              onNova={handleNova}
              onForcarNova={() => setShowForcarModal(true)}
            />
          )
        })()}
      </main>

      <ForcarNovaModal
        open={showForcarModal}
        onClose={() => setShowForcarModal(false)}
        onConfirm={handleForcarNova}
      />
    </div>
  )
}
