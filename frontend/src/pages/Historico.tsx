import { useState, useRef } from 'react'
import { Spinner } from '../components/Spinner'
import { VeredittoBadge, scoreColor } from '../components/Badge'
import { DadosExtrasView } from '../components/DadosExtrasView'
import { useHistorico } from '../hooks/useHistorico'
import { formatCPF, formatDate, exportToCSV } from '../lib/formatters'
import { inp } from '../lib/styles'
import { ConsultaRow, DadosExtras } from '../types'

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
    if (selectedRow?.id === row.id) {
      setSelectedRow(null)
      setSelectedExtras(null)
      activeExtrasId.current = null
      return
    }
    setSelectedRow(row)
    setSelectedExtras(null)
    setExtrasLoading(true)
    activeExtrasId.current = row.id
    const extras = await loadDadosExtras(row.id)
    if (activeExtrasId.current !== row.id) return
    setSelectedExtras(extras)
    setExtrasLoading(false)
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

      {/* Filtros — settings row */}
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
      {loading && (
        <div className="flex justify-center py-20"><Spinner /></div>
      )}

      {error && (
        <p className="text-[#aa0000] text-sm text-center py-8">{error}</p>
      )}

      {!loading && !error && (
        <div className="pt-6 flex flex-col lg:flex-row gap-6 items-start">

          {/* Tabela */}
          <div className={selectedRow ? 'flex-1 min-w-0' : 'w-full'}>
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
                      className={`cursor-pointer transition-colors ${
                        selectedRow?.id === row.id ? 'bg-[#f9fafb]' : 'hover:bg-[#f9fafb]'
                      }`}
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

          {/* Painel de detalhe — settings rows */}
          {selectedRow && (
            <div className="w-full lg:w-[340px] lg:shrink-0 animate-fade-in">
              <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden sticky top-6">

                {/* Header */}
                <div className="px-5 py-3.5 border-b border-[#f3f4f6] flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Detalhe</p>
                  <button onClick={() => { setSelectedRow(null); setSelectedExtras(null); setExtrasLoading(false); activeExtrasId.current = null }}
                    className="text-[#d1d5db] hover:text-[#6b7280] transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="divide-y divide-[#f3f4f6]">

                  {/* Score row */}
                  <div className="px-5 py-5">
                    <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Score de Crédito</p>
                    {selectedRow.score !== null ? (
                      <div className="space-y-2">
                        <div className="flex items-end gap-3">
                          <p
                            className={`font-bold leading-none tabular-nums ${scoreColor(selectedRow.score)}`}
                            style={{ fontSize: '3.5rem' }}
                          >
                            {selectedRow.score}
                          </p>
                          <div className="pb-0.5 space-y-1">
                            {selectedRow.veredito && <VeredittoBadge veredito={selectedRow.veredito} />}
                            {selectedRow.faixa && <p className="text-xs text-[#6b7280]">{selectedRow.faixa}</p>}
                          </div>
                        </div>
                        <p className="text-[10px] text-[#9ca3af] font-mono tracking-[0.2em]">{formatCPF(selectedRow.cpf)}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-[#9ca3af]">
                          {selectedRow.tipo_resultado === 'cpf_nao_encontrado' ? 'CPF não encontrado' : 'Erro de sistema'}
                        </p>
                        <p className="text-[10px] text-[#9ca3af] font-mono tracking-[0.2em] mt-1">{formatCPF(selectedRow.cpf)}</p>
                      </div>
                    )}
                  </div>

                  {/* Meta rows */}
                  {[
                    { label: 'Operador',       value: selectedRow.profiles?.nome ?? '—' },
                    { label: 'Data / Hora',     value: formatDate(selectedRow.criado_em) },
                    { label: 'Doc. conferido',  value: selectedRow.documento_conferido ? 'Sim' : 'Não' },
                    ...(selectedRow.forcou_nova
                      ? [{ label: 'Forçou nova', value: selectedRow.motivo_forca ?? 'Sim' }]
                      : []),
                    ...(selectedRow.apis_utilizadas?.length
                      ? [{ label: 'APIs usadas', value: `${selectedRow.apis_utilizadas.length} consultadas` }]
                      : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="px-5 py-3 flex items-baseline justify-between gap-3">
                      <span className="text-xs font-medium text-[#9ca3af] shrink-0">{label}</span>
                      <span className="text-xs text-[#374151] text-right truncate">{value}</span>
                    </div>
                  ))}

                  {/* Dados extras — carregados sob demanda */}
                  {extrasLoading ? (
                    <div className="px-5 py-5 flex justify-center"><Spinner size="sm" /></div>
                  ) : selectedExtras && Object.keys(selectedExtras).length > 0 ? (
                    <div className="px-5 py-5">
                      <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4">Dados adicionais</p>
                      <DadosExtrasView dados={selectedExtras} />
                    </div>
                  ) : (
                    <div className="px-5 py-5 text-center">
                      <p className="text-xs text-[#d1d5db]">sem análise adicional</p>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
