import { Header } from '../components/Header'
import { Spinner } from '../components/Spinner'
import { VeredittoBadge } from '../components/Badge'
import { useHistorico } from '../hooks/useHistorico'
import { formatCPF, formatDate, exportToCSV } from '../lib/formatters'

export function Historico() {
  const {
    rows, rowsFiltrados, loading, error,
    filtros, setFiltros,
    pagina, setPagina, totalPaginas,
    operadores,
  } = useHistorico()

  function handleExportCSV() {
    const csvRows = rowsFiltrados.map(r => ({
      CPF:           formatCPF(r.cpf),
      Score:         r.score ?? '',
      Resultado:     r.veredito ?? (r.tipo_resultado === 'cpf_nao_encontrado' ? 'Nao encontrado' : 'Erro'),
      Operador:      r.profiles?.nome ?? '',
      'Data/Hora':   formatDate(r.criado_em),
      'Doc. Conferido': r.documento_conferido ? 'Sim' : 'Nao',
      'Forcou Nova': r.forcou_nova ? 'Sim' : 'Nao',
      'Motivo Forca': r.motivo_forca ?? '',
    }))
    exportToCSV(csvRows, `historico-credito-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Histórico de Consultas</h2>
          <button
            onClick={handleExportCSV}
            disabled={rowsFiltrados.length === 0}
            className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg
                       hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Exportar CSV
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="CPF"
            value={filtros.cpf}
            onChange={e => setFiltros({ cpf: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filtros.operador}
            onChange={e => setFiltros({ operador: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos operadores</option>
            {operadores.map(op => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
          <select
            value={filtros.veredito}
            onChange={e => setFiltros({ veredito: e.target.value as typeof filtros.veredito })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos resultados</option>
            <option value="APROVADO">Aprovado</option>
            <option value="MANUAL">Análise Manual</option>
            <option value="NEGADO">Negado</option>
            <option value="cpf_nao_encontrado">CPF não encontrado</option>
            <option value="erro_sistema">Erro de sistema</option>
          </select>
          <input
            type="date"
            value={filtros.dataInicio}
            onChange={e => setFiltros({ dataInicio: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={filtros.dataFim}
            onChange={e => setFiltros({ dataFim: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Conteudo */}
        {loading && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}

        {error && (
          <p className="text-red-600 text-sm text-center py-8">{error}</p>
        )}

        {!loading && !error && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['CPF', 'Score', 'Resultado', 'Operador', 'Data/Hora'].map(col => (
                      <th key={col} className="text-left px-4 py-3 font-medium text-gray-600">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-gray-400 py-10">
                        Nenhum registro encontrado
                      </td>
                    </tr>
                  )}
                  {rows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-gray-900">
                        {formatCPF(row.cpf)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.score ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {row.veredito ? (
                          <VeredittoBadge veredito={row.veredito} />
                        ) : row.tipo_resultado === 'cpf_nao_encontrado' ? (
                          <span className="text-blue-600 text-xs font-medium">Não encontrado</span>
                        ) : (
                          <span className="text-orange-600 text-xs font-medium">Erro</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.profiles?.nome ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(row.criado_em)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                             hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-600">
                  {pagina} / {totalPaginas}
                </span>
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                             hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Próximo
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
