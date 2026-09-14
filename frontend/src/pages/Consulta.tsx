import { useState, useRef, useEffect } from 'react'
import { Spinner } from '../components/Spinner'
import { VeredittoBadge, scoreColor } from '../components/Badge'
import { ForcarNovaModal } from '../components/ForcarNovaModal'
import { DadosExtrasView } from '../components/DadosExtrasView'
import { useConsulta } from '../hooks/useConsulta'
import { formatCPF, stripCPF, isValidCPF, formatDate } from '../lib/formatters'
import { inp, sel } from '../lib/styles'
import {
  calcularRecomendacao, FormExtra, Recomendacao, TipoMoradia,
} from '../lib/recomendacao'
import { ResultadoOk, Veredito, DadosExtras } from '../types'

// ─── APIs disponíveis ─────────────────────────────────────────────────────────

const SCORE_CUSTO = 2.34

const API_OPCOES = [
  { slug: 'nivel-socioeconomico',  nome: 'Nível Socioeconômico e Renda',    descricao: 'Classe social (A–E), renda estimada, ocupação (CBO), escolaridade e perfil domiciliar',             preco: 0.43 },
  { slug: 'cadastro-pf-plus',      nome: 'Cadastro Pessoal Completo',        descricao: 'Nome, nascimento, endereços, telefones, situação cadastral na Receita Federal',                      preco: 0.72 },
  { slug: 'registration-brazil',   nome: 'Validação Cadastral (Antifraude)', descricao: 'Confirma identidade, endereços e faixa salarial. Detecta inconsistências e fraudes',               preco: 0.43 },
  { slug: 'processos-agrupada',    nome: 'Processos Judiciais',              descricao: 'Total de processos como réu/autor, valor das ações, distribuição por área e ano',                   preco: 1.65 },
  { slug: 'antecedentes-federais', nome: 'Antecedentes Criminais — PF',     descricao: 'Certidão SINIC da Polícia Federal — condenações com trânsito em julgado',                           preco: 0.60 },
  { slug: 'assistencia-social-pf', nome: 'Benefícios Sociais',              descricao: 'Bolsa Família, BPC, Auxílio Emergencial, Garantia-Safra, Seguro-Defeso (últimos 12 meses)',          preco: 1.07 },
] as const

type ApiSlug = typeof API_OPCOES[number]['slug']

// ─── Helpers de UI ─────────────────────────────────────────────────────────────

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <div className="relative shrink-0">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-4 h-4 border border-[#d1d5db] rounded bg-white peer-checked:bg-[#aa0000] peer-checked:border-[#aa0000] transition-all" />
        {checked && (
          <svg className="absolute inset-0 w-4 h-4 text-white p-0.5" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-sm text-[#374151] group-hover:text-[#111827] transition-colors">{label}</span>
    </label>
  )
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 1000) * 100
  return (
    <div className="space-y-1.5">
      <div className="relative w-full h-1.5 flex rounded-full overflow-hidden">
        <div className="bg-[#fca5a5] rounded-l-full" style={{ width: '50%' }} />
        <div className="bg-[#fcd34d]" style={{ width: '15%' }} />
        <div className="bg-[#86efac] rounded-r-full" style={{ width: '35%' }} />
        <div
          className="absolute top-1/2 w-3 h-3 rounded-full bg-white border-2 border-[#6b7280] shadow"
          style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-mono select-none">
        <span className="text-[#aa0000]">Alto risco</span>
        <span className="text-[#b45309]">Moderado</span>
        <span className="text-[#16a34a]">Baixo risco</span>
      </div>
    </div>
  )
}

function RecomendacaoCard({ rec }: { rec: Recomendacao }) {
  const cfg = {
    RECOMENDADO:     { bar: 'bg-[#16a34a]', tc: 'text-[#16a34a]', bg: 'bg-[#f0fdf4]', border: 'border-[#dcfce7]', icon: '✓' },
    CONDICIONAL:     { bar: 'bg-[#b45309]', tc: 'text-[#b45309]', bg: 'bg-[#fffbeb]', border: 'border-[#fef3c7]', icon: '!' },
    NAO_RECOMENDADO: { bar: 'bg-[#aa0000]', tc: 'text-[#aa0000]', bg: 'bg-[#fef2f2]', border: 'border-[#fee2e2]', icon: '✕' },
  }[rec.nivel]

  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-xl overflow-hidden`}>
      <div className={`h-0.5 w-full ${cfg.bar}`} />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${cfg.tc}`}>{cfg.icon}</span>
          <p className={`font-semibold text-sm ${cfg.tc}`}>{rec.titulo}</p>
        </div>
        {rec.fatoresPositivos.length > 0 && (
          <div className="space-y-1">
            {rec.fatoresPositivos.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-[#374151]">
                <span className="shrink-0 text-[#16a34a] mt-0.5 font-bold">+</span><span>{f}</span>
              </div>
            ))}
          </div>
        )}
        {rec.fatoresNegativos.length > 0 && (
          <div className="space-y-1">
            {rec.fatoresNegativos.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-[#6b7280]">
                <span className="shrink-0 text-[#aa0000] mt-0.5 font-bold">−</span><span>{f}</span>
              </div>
            ))}
          </div>
        )}
        {rec.condicoes.length > 0 && (
          <div className="pt-3 border-t border-black/5 space-y-1">
            <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">Condições</p>
            {rec.condicoes.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-[#b45309]">
                <span className="shrink-0 mt-0.5">→</span><span>{c}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── View de resultado ok ──────────────────────────────────────────────────────

function ResultadoOkView({
  data, cpf, extra, onNova, onForcarNova,
}: {
  data: ResultadoOk
  cpf: string
  extra: FormExtra
  onNova: () => void
  onForcarNova: () => void
}) {
  const rec = calcularRecomendacao(data.score, data.veredito, extra, data.dadosExtras)

  return (
    <div className="animate-slide-in">

      {/* Cache notice */}
      {data.cache_hit && (
        <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg">
          <span className="text-xs text-[#6b7280]">
            Cache — {data.cache_data ? formatDate(data.cache_data) : ''} — sem nova cobrança
          </span>
          <button onClick={onForcarNova} className="text-xs text-[#6b7280] hover:text-[#111827] underline underline-offset-2 transition-colors shrink-0">
            Forçar nova
          </button>
        </div>
      )}

      <div className="divide-y divide-[#e5e7eb]">

        {/* Identificação */}
        <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-4 sm:gap-8 py-6">
          <div>
            <p className="text-sm font-medium text-[#111827]">Identificação</p>
            <p className="text-sm text-[#6b7280] mt-1">Dados do cliente consultado</p>
          </div>
          <div className="space-y-1">
            {extra.nomeCliente && (
              <p className="text-sm font-semibold text-[#111827]">{extra.nomeCliente}</p>
            )}
            <p className="text-sm font-mono text-[#6b7280]">{formatCPF(cpf)}</p>
            <p className="text-xs text-[#9ca3af]">{data.cache_hit ? 'Cache hit' : 'Nova consulta'}</p>
          </div>
        </div>

        {/* Score */}
        <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-4 sm:gap-8 py-6">
          <div>
            <p className="text-sm font-medium text-[#111827]">Score de Crédito</p>
            <p className="text-sm text-[#6b7280] mt-1">Pontuação QUOD (0–1000)</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-end gap-5">
              <p
                className={`font-bold leading-none tabular-nums ${scoreColor(data.score)}`}
                style={{ fontSize: '5rem' }}
              >
                {data.score}
              </p>
              <div className="pb-1 space-y-1.5">
                <VeredittoBadge veredito={data.veredito} />
                {data.faixa && <p className="text-xs text-[#6b7280]">{data.faixa}</p>}
              </div>
            </div>
            <ScoreBar score={data.score} />
          </div>
        </div>

        {/* Recomendação */}
        <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-4 sm:gap-8 py-6">
          <div>
            <p className="text-sm font-medium text-[#111827]">Recomendação</p>
            <p className="text-sm text-[#6b7280] mt-1">Análise baseada em todos os fatores</p>
          </div>
          <div>
            <RecomendacaoCard rec={rec} />
          </div>
        </div>

        {/* Análise Quod */}
        {(data.capacidadePagamento || data.perfil) && (
          <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-4 sm:gap-8 py-6">
            <div>
              <p className="text-sm font-medium text-[#111827]">Análise Quod</p>
              <p className="text-sm text-[#6b7280] mt-1">Perfil e capacidade de pagamento</p>
            </div>
            <div className="space-y-3">
              {data.capacidadePagamento && (
                <div>
                  <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-1">Capacidade de pagamento</p>
                  <p className="text-sm text-[#374151]">{data.capacidadePagamento}</p>
                </div>
              )}
              {data.perfil && (
                <div>
                  <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-1">Perfil</p>
                  <p className="text-sm text-[#374151]">{data.perfil}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* APIs extras (cada uma como settings row) */}
        <DadosExtrasView dados={data.dadosExtras} layout="settings" />

      </div>

      {/* Footer */}
      <div className="pt-6 border-t border-[#e5e7eb] flex justify-end">
        <button onClick={onNova} className="text-sm text-[#6b7280] hover:text-[#111827] transition-colors">
          Nova consulta →
        </button>
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-4 sm:gap-8 py-6">
      <div>
        <p className="text-sm font-medium text-[#111827]">{label}</p>
        <p className="text-sm text-[#6b7280] mt-1 leading-relaxed">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  )
}

export function Consulta() {
  const [cpfDisplay, setCpfDisplay]        = useState('')
  const [documentoConferido, setDocumento] = useState(false)
  const [showForcarModal, setForcarModal]  = useState(false)
  const { state, consultar, reset }        = useConsulta()

  const [nomeCliente, setNomeCliente]     = useState('')
  const [tipoMoradia, setTipoMoradia]     = useState<TipoMoradia>('nao_informado')
  const [apenasAbrindo, setApenasAbrindo] = useState(false)
  const [valor, setValor]                 = useState('')
  const [parcelas, setParcelas]           = useState(1)
  const [finalidade, setFinalidade]       = useState('')
  const [temComprovante, setComprovante]  = useState(false)
  const [temIndicacao, setIndicacao]      = useState(false)
  const [jaECliente, setJaECliente]       = useState(false)

  const [apisAtivas, setApisAtivas] = useState<Set<ApiSlug>>(new Set(['nivel-socioeconomico']))

  const [extraSnapshot, setExtraSnapshot] = useState<FormExtra>({
    nomeCliente: '', tipoMoradia: 'nao_informado', valor: 0, parcelas: 1,
    finalidade: '', temComprovante: false, temIndicacao: false, jaECliente: false,
  })

  const cpfDigits = stripCPF(cpfDisplay)
  const cpfValido = isValidCPF(cpfDisplay)

  function toggleApi(slug: ApiSlug) {
    setApisAtivas(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const custoTotal = SCORE_CUSTO + API_OPCOES
    .filter(a => apisAtivas.has(a.slug))
    .reduce((sum, a) => sum + a.preco, 0)

  function handleConsultar() {
    if (!cpfValido || !documentoConferido) return
    setExtraSnapshot({
      nomeCliente, tipoMoradia,
      valor: apenasAbrindo ? 0 : parseFloat(valor.replace(',', '.')) || 0,
      parcelas: apenasAbrindo ? 0 : parcelas,
      finalidade: apenasAbrindo ? '' : finalidade,
      temComprovante, temIndicacao, jaECliente,
    })
    consultar(cpfDigits, documentoConferido, Array.from(apisAtivas), nomeCliente)
  }

  function handleForcarNova(motivo: string) {
    setForcarModal(false)
    consultar(cpfDigits, documentoConferido, Array.from(apisAtivas), nomeCliente, motivo)
  }

  function handleNova() {
    setCpfDisplay(''); setDocumento(false); setNomeCliente('')
    setTipoMoradia('nao_informado'); setValor(''); setParcelas(1)
    setApenasAbrindo(false); setFinalidade(''); setComprovante(false)
    setIndicacao(false); setJaECliente(false); reset()
  }

  const isLoading = state.status === 'loading'
  const hasResult = state.status === 'resultado'

  const resultRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if ((isLoading || hasResult) && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [state.status]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="px-4 sm:px-8 py-8">

        {/* Page header */}
        <div className="pb-6 border-b border-[#e5e7eb] flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[#111827]">Consulta de Crédito</h1>
            <p className="text-sm text-[#6b7280] mt-1">Score QUOD e dados complementares</p>
          </div>
          <span className="text-xs text-[#9ca3af] font-mono mt-1.5 shrink-0">R$ {custoTotal.toFixed(2)} / consulta</span>
        </div>

        {/* Settings rows */}
        <div className="divide-y divide-[#e5e7eb]">

          {/* Identificação */}
          <SettingRow label="Identificação" description="Nome e CPF do cliente para consulta">
            <div className="space-y-3">
              <input type="text" placeholder="Nome completo (opcional)" value={nomeCliente}
                onChange={e => setNomeCliente(e.target.value)} className={inp} />
              <input type="text" inputMode="numeric" placeholder="000.000.000-00"
                value={cpfDisplay} onChange={e => setCpfDisplay(formatCPF(e.target.value))}
                maxLength={14} className={`${inp} font-mono tracking-wider`} />
            </div>
          </SettingRow>

          {/* Moradia */}
          <SettingRow label="Tipo de moradia" description="Influencia a pontuação da análise de crédito">
            <div className="relative">
              <select value={tipoMoradia} onChange={e => setTipoMoradia(e.target.value as TipoMoradia)} className={sel}>
                <option value="nao_informado">Não informado</option>
                <option value="propria">Própria</option>
                <option value="familiar">Com familiar</option>
                <option value="alugada">Alugada</option>
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af] pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </SettingRow>

          {/* Compra */}
          <SettingRow label="Compra" description="Dados da operação a ser financiada pelo crediário">
            <div className="space-y-4">
              <Check
                checked={apenasAbrindo}
                onChange={v => { setApenasAbrindo(v); if (v) { setValor(''); setParcelas(1); setFinalidade('') } }}
                label="Apenas abrindo crediário — sem compra agora"
              />

              {!apenasAbrindo && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Valor (R$)</label>
                      <input type="text" inputMode="decimal" placeholder="0,00" value={valor}
                        onChange={e => setValor(e.target.value)} className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Parcelas</label>
                      <div className="relative">
                        <select value={parcelas} onChange={e => setParcelas(Number(e.target.value))} className={sel}>
                          {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x</option>)}
                        </select>
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af] pointer-events-none"
                          fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">Finalidade</label>
                    <input type="text" placeholder="Ex: guarda-roupa, cama, calçado..."
                      value={finalidade} onChange={e => setFinalidade(e.target.value)} className={inp} />
                  </div>
                </div>
              )}
            </div>
          </SettingRow>

          {/* Análise */}
          <SettingRow label="Análise" description="Fatores adicionais que influenciam a recomendação final">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Check checked={documentoConferido} onChange={setDocumento}   label="Documento conferido" />
              <Check checked={temComprovante}     onChange={setComprovante} label="Comprovante de renda" />
              <Check checked={temIndicacao}       onChange={setIndicacao}   label="Tem indicação" />
              <Check checked={jaECliente}         onChange={setJaECliente}  label="Já é cliente" />
            </div>
          </SettingRow>

          {/* APIs */}
          <SettingRow label="Dados adicionais" description="APIs complementares para análise mais completa">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#9ca3af] pb-2.5 border-b border-[#f3f4f6]">
                <span>Score de Crédito (Quod) — incluído</span>
                <span className="font-mono">R$ {SCORE_CUSTO.toFixed(2)}</span>
              </div>
              {API_OPCOES.map(api => {
                const ativo = apisAtivas.has(api.slug)
                return (
                  <label key={api.slug}
                    className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-all ${
                      ativo ? 'border-[#e5e7eb] bg-[#f9fafb]' : 'border-[#f3f4f6] hover:border-[#e5e7eb]'
                    }`}
                  >
                    <div className="relative shrink-0 mt-0.5">
                      <input type="checkbox" checked={ativo} onChange={() => toggleApi(api.slug)} className="sr-only peer" />
                      <div className="w-4 h-4 border border-[#d1d5db] rounded bg-white peer-checked:bg-[#aa0000] peer-checked:border-[#aa0000] transition-all" />
                      {ativo && (
                        <svg className="absolute inset-0 w-4 h-4 text-white p-0.5" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`text-sm font-medium ${ativo ? 'text-[#111827]' : 'text-[#6b7280]'}`}>{api.nome}</span>
                        <span className="text-xs text-[#9ca3af] font-mono shrink-0">R$ {api.preco.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-[#9ca3af] mt-0.5 leading-relaxed">{api.descricao}</p>
                    </div>
                  </label>
                )
              })}

              <div className="flex justify-between items-center pt-2.5 border-t border-[#f3f4f6]">
                <span className="text-sm text-[#6b7280]">Total da consulta</span>
                <span className="text-sm font-semibold text-[#111827] font-mono">R$ {custoTotal.toFixed(2)}</span>
              </div>
            </div>
          </SettingRow>

        </div>

        {/* Actions */}
        <div className="pt-6 border-t border-[#e5e7eb] flex items-center justify-between">
          {!documentoConferido && (
            <p className="text-xs text-[#9ca3af]">Confirme que o documento foi conferido</p>
          )}
          {documentoConferido && !cpfValido && (
            <p className="text-xs text-[#9ca3af]">Informe um CPF válido</p>
          )}
          {documentoConferido && cpfValido && (
            <span />
          )}
          <button
            onClick={handleConsultar}
            disabled={!cpfValido || !documentoConferido || isLoading}
            className="ml-auto px-5 py-2.5 bg-[#111827] text-white rounded-lg text-sm font-semibold
                       hover:bg-[#374151] disabled:opacity-40 transition-colors
                       flex items-center gap-2"
          >
            {isLoading ? <><Spinner size="sm" /> Consultando...</> : 'Consultar'}
          </button>
        </div>

        {/* Resultado */}
        {(isLoading || hasResult) && (
          <div ref={resultRef} className="mt-8 pt-8 border-t border-[#e5e7eb]">

            {isLoading && (
              <div className="flex flex-col items-center gap-3 py-16">
                <Spinner />
                <p className="text-xs text-[#9ca3af] font-mono tracking-wider uppercase">Consultando...</p>
              </div>
            )}

            {state.status === 'resultado' && (() => {
              const { data } = state

              if (data.tipo === 'cpf_nao_encontrado') {
                return (
                  <div className="bg-white border border-[#e5e7eb] rounded-xl p-10 text-center space-y-4 animate-slide-in">
                    <div className="w-10 h-10 rounded-full bg-[#f3f4f6] flex items-center justify-center mx-auto">
                      <svg className="w-5 h-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803M10.5 7.5v6m3-3h-6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#111827]">CPF não localizado</h3>
                      <p className="text-sm text-[#6b7280] mt-1">Seguir para análise manual.</p>
                    </div>
                    <button onClick={handleNova} className="text-sm text-[#6b7280] hover:text-[#111827] transition-colors">
                      Nova consulta →
                    </button>
                  </div>
                )
              }

              if (data.tipo === 'erro_sistema') {
                return (
                  <div className="bg-white border border-[#e5e7eb] rounded-xl p-10 text-center space-y-4 animate-slide-in">
                    <div className="w-10 h-10 rounded-full bg-[#f3f4f6] flex items-center justify-center mx-auto">
                      <svg className="w-5 h-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#111827]">Consulta indisponível</h3>
                      <p className="text-sm text-[#6b7280] mt-1">Verifique o saldo e tente novamente.</p>
                    </div>
                    <details className="text-left text-xs text-[#9ca3af]">
                      <summary className="cursor-pointer hover:text-[#6b7280] transition-colors">Detalhes técnicos</summary>
                      <p className="mt-2 font-mono bg-[#f9fafb] p-3 rounded-lg border border-[#e5e7eb] text-[#6b7280]">{data.motivo}</p>
                    </details>
                    <button onClick={handleNova} className="text-sm text-[#6b7280] hover:text-[#111827] transition-colors">
                      Tentar novamente →
                    </button>
                  </div>
                )
              }

              return (
                <ResultadoOkView
                  data={data} cpf={cpfDigits} extra={extraSnapshot}
                  onNova={handleNova} onForcarNova={() => setForcarModal(true)}
                />
              )
            })()}
          </div>
        )}
      </div>

      <ForcarNovaModal open={showForcarModal} onClose={() => setForcarModal(false)} onConfirm={handleForcarNova} />
    </>
  )
}
