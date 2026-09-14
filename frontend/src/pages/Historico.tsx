import { useState, useRef, useEffect } from 'react'
import { Spinner } from '../components/Spinner'
import { VeredittoBadge, scoreColor } from '../components/Badge'
import { DadosExtrasView } from '../components/DadosExtrasView'
import { useHistorico } from '../hooks/useHistorico'
import { formatCPF, formatDate, exportToCSV } from '../lib/formatters'
import { inp } from '../lib/styles'
import { ConsultaRow, DadosExtras } from '../types'

function DetalheModal({ row, extras, extrasLoading, onClose }: {
  row: ConsultaRow
  extras: DadosExtras | null
  extrasLoading: boolean
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const meta = [
    { label: 'Operador',      value: row.profiles?.nome ?? '—' },
    { label: 'Data / Hora',   value: formatDate(row.criado_em) },
    { label: 'Doc. conferido', value: row.documento_conferido ? 'Sim' : 'Não' },
    ...(row.forcou_nova ? [{ label: 'Forçou nova', value: row.motivo_forca ?? 'Sim' }] : []),
    ...(row.apis_utilizadas?.length ? [{ label: 'APIs usadas', value: `${row.apis_utilizadas.length} consultadas` }] : []),
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col animate-fade-in">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6] shrink-0">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-[#111827]">Detalhe da consulta</p>
            <p className="text-xs font-mono text-[#9ca3af] tracking-wider">{formatCPF(row.cpf)}</p>
          </div>
          <button onClick={onClose} className="text-[#d1d5db] hover:text-[#6b7280] transition-colors p-1 rounded-lg hover:bg-[#f9fafb]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">

          {/* Score + meta — two columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-[#f3f4f6]">

            {/* Score */}
            <div className="px-6 py-6">
              <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-4">Score de Crédito</p>
              {row.score !== null ? (
                <div className="space-y-3">
                  <div className="flex items-end gap-4">
                    <p className={`font-bold leading-none tabular-nums ${scoreColor(row.score)}`} style={{ fontSize: '4.5rem' }}>
                      {row.score}
                    </p>
                    <div className="pb-1 space-y-1.5">
                      {row.veredito && <VeredittoBadge veredito={row.veredito} />}
                      {row.faixa && <p className="text-xs text-[#6b7280]">{row.faixa}</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#9ca3af]">
                  {row.tipo_resultado === 'cpf_nao_encontrado' ? 'CPF não encontrado' : 'Erro de sistema'}
                </p>
              )}
            </div>

            {/* Meta */}
            <div className="px-6 py-6">
              <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-4">Informações</p>
              <div className="space-y-0">
                {meta.map(({ label, value }) => (
                  <div key={label} className="flex items-baseline justify-between gap-4 py-2.5 border-b border-[#f7f7f7] last:border-0">
                    <span className="text-xs text-[#9ca3af] shrink-0">{label}</span>
                    <span className="text-xs text-[#374151] text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dados extras */}
          <div className="border-t border-[#f3f4f6]">
            {extrasLoading ? (
              <div className="flex justify-center py-10"><Spinner size="sm" /></div>
            ) : extras && Object.keys(extras).length > 0 ? (
              <div className="px-6 py-6">
                <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-5">Dados adicionais</p>
                <DadosExtrasView dados={extras} layout="settings" />
              </div>
            ) : (
              <div className="px-6 py-8 text-center">
                <p className="text-xs text-[#d1d5db]">Sem análise adicional nesta consulta</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export function Historico() {
  const {
    rows, rowsFiltrados, loading, error,
    filtros, setFiltros,
    pagina, setPagina, totalPaginas,
    operadores,
    loadDadosExtras,
  } = useHistorico()

  const [selectedRow, setSelectedRow] = useState<ConsultaRow | null>(null)
  const [selectedExtras, setSelectedExtras] = useState<DadosExtras | null>(null)
  const [extrasLoading, setExtrasLoading] = useState(false)
  const activeExtrasId = useRef<string | null>(null)

  async function handleRowClick(row: ConsultaRow) {
    setSelectedRow(row)
    setSelectedExtras(null)
    setExtrasLoading(true)
    activeExtrasId.current = row.id
    const extras = await loadDadosExtras(row.id)
    if (activeExtrasId.current !== row.id) return
    setSelectedExtras(extras)
    setExtrasLoading(false)
  }

  function handleClose() {
    setSelectedRow(null)
    setSelectedExtras(null)
    setExtrasLoading(false)
    activeExtrasId.current = null
  }

  function handleExportCSV() {
    const csvRows = rowsFiltrados.map(r => ({
      CPF:              formatCPF(r.cpf),
      Score:            r.score ?? '',
      Resultado:        r.veredito ?? (r.tipo_resultado === 'cpf_nao_encontrado' ? 'Nao encontrado' : 'Erro'),
      Operador:         r.profiles?.nome ?? '',
      'Data/Hora':      formatDate(r.criado_em),
      'Doc. Conferido': r.documento_conferido ? 'Sim' : 'Nao',
      'Forcou Nova':    r.forcou_nova ? 'Sim' : 'Nao',
      'Motivo Forca':   r.motivo_forca ?? '',
    }))
    exportToCSV(csvRows, `historico-credito-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <>
      <div className="px-4 sm:px-8 py-8">

        {/* Page header */}
        <div className="pb-6 border-b border-[#e5e7eb] flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[#111827]">Histórico</h1>
            <p className="text-sm text-[#6b7280] mt-1">{rowsFiltrados.length} consultas encontradas</p>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={rowsFiltrados.length === 0}
            className="px-4 py-2 text-sm font-medium text-[#374151] bg-white border border-[#e5e7eb] rounded-lg
                       hover:bg-[#f9fafb] disabled:opacity-40 transition-all"
          >
            Exportar CSV
          </button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-4 sm:gap-8 py-6 border-b border-[#e5e7eb]">
          <div>
            <p className="text-sm font-medium text-[#111827]">Filtros</p>
            <p className="text-sm text-[#6b7280] mt-1">Busque por CPF, operador, resultado e período</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Filtrar por CPF" value={filtros.cpf}
              onChange={e => setFiltros({ cpf: e.target.value })} className={inp} />
            <select value={filtros.operador} onChange={e => setFiltros({ operador: e.target.value })} className={inp}>
              <option value="">Todos operadores</option>
              {operadores.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
            <select value={filtros.veredito}
              onChange={e => setFiltros({ veredito: e.target.value as typeof filtros.veredito })} className={inp}>
              <option value="">Todos resultados</option>
              <option value="APROVADO">Aprovado</option>
              <option value="MANUAL">Análise Manual</option>
              <option value="NEGADO">Negado</option>
              <option value="cpf_nao_encontrado">Não encontrado</option>
              <option value="erro_sistema">Erro</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={filtros.dataInicio}
                onChange={e => setFiltros({ dataInicio: e.target.value })} className={inp} />
              <input type="date" value={filtros.dataFim}
                onChange={e => setFiltros({ dataFim: e.target.value })} className={inp} />
            </div>
          </div>
        </div>

        {/* Content */}
        {loading && <div className="flex justify-center py-20"><Spinner /></div>}
        {error && <p className="text-[#aa0000] text-sm text-center py-8">{error}</p>}

        {!loading && !error && (
          <div className="pt-6">
            <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f3f4f6]">
                    {['CPF', 'Score', 'Resultado', 'Operador', 'Data/Hora'].map(col => (
                      <th key={col} className="text-left px-5 py-3 text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f4f6]">
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-[#9ca3af] py-16 text-sm">
                        Nenhum registro encontrado
                      </td>
                    </tr>
                  )}
                  {rows.map(row => (
                    <tr
                      key={row.id}
                      onClick={() => handleRowClick(row)}
                      className="cursor-pointer transition-colors hover:bg-[#f9fafb]"
                    >
                      <td className="px-5 py-3.5 font-mono text-[#6b7280] text-xs tracking-wider">
                        {formatCPF(row.cpf)}
                      </td>
                      <td className={`px-5 py-3.5 font-bold font-mono tabular-nums text-sm ${
                        row.score !== null ? scoreColor(row.score) : 'text-[#d1d5db]'
                      }`}>
                        {row.score ?? '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {row.veredito ? (
                          <VeredittoBadge veredito={row.veredito} />
                        ) : row.tipo_resultado === 'cpf_nao_encontrado' ? (
                          <span className="text-xs text-[#9ca3af]">Não encontrado</span>
                        ) : (
                          <span className="text-xs text-[#d1d5db]">Erro</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[#6b7280] text-xs">
                        {row.profiles?.nome ?? <span className="text-[#d1d5db]">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-[#9ca3af] whitespace-nowrap text-xs font-mono">
                        {formatDate(row.criado_em)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-4 pt-5">
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                  className="px-4 py-2 text-sm font-medium text-[#374151] bg-white border border-[#e5e7eb] rounded-lg
                             hover:bg-[#f9fafb] disabled:opacity-40 transition-all">
                  Anterior
                </button>
                <span className="text-sm text-[#6b7280] font-mono tabular-nums">{pagina} / {totalPaginas}</span>
                <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                  className="px-4 py-2 text-sm font-medium text-[#374151] bg-white border border-[#e5e7eb] rounded-lg
                             hover:bg-[#f9fafb] disabled:opacity-40 transition-all">
                  Próximo
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedRow && (
        <DetalheModal
          row={selectedRow}
          extras={selectedExtras}
          extrasLoading={extrasLoading}
          onClose={handleClose}
        />
      )}
    </>
  )
}
