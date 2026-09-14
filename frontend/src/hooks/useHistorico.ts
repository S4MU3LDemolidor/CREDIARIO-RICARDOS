import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ConsultaRow, DadosExtras, Veredito, TipoResultado } from '../types'

export type FiltroVeredito = Veredito | TipoResultado | ''

export type FiltrosHistorico = {
  cpf: string
  operador: string
  veredito: FiltroVeredito
  dataInicio: string
  dataFim: string
}

const FILTROS_INICIAIS: FiltrosHistorico = {
  cpf: '',
  operador: '',
  veredito: '',
  dataInicio: '',
  dataFim: '',
}

const POR_PAGINA = 20

export function useHistorico() {
  const [rows, setRows]       = useState<ConsultaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [filtros, setFiltrosState] = useState<FiltrosHistorico>(FILTROS_INICIAIS)
  const [pagina, setPagina]   = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    // Carrega sem dados_extras — campo pesado carregado sob demanda ao selecionar linha
    supabase
      .from('consultas')
      .select('id, cpf, score, veredito, faixa, tipo_resultado, motivo_erro, loja_id, operador_id, documento_conferido, forcou_nova, motivo_forca, criado_em, apis_utilizadas, profiles(nome)')
      .order('criado_em', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) setError(err.message)
        else setRows((data ?? []).map(r => ({ ...r, dados_extras: null })) as unknown as ConsultaRow[])
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  async function loadDadosExtras(id: string): Promise<DadosExtras | null> {
    const { data, error } = await supabase
      .from('consultas')
      .select('dados_extras')
      .eq('id', id)
      .single()
    if (error) { console.error('loadDadosExtras failed:', error); return null }
    return (data?.dados_extras as DadosExtras) ?? null
  }

  const operadores = useMemo(() => {
    const nomes = new Set(
      rows.map(r => r.profiles?.nome).filter((n): n is string => !!n)
    )
    return Array.from(nomes).sort()
  }, [rows])

  const rowsFiltrados = useMemo(() => {
    return rows.filter(row => {
      if (filtros.cpf) {
        const cpfBusca = filtros.cpf.replace(/\D/g, '')
        if (!row.cpf.includes(cpfBusca)) return false
      }
      if (filtros.operador) {
        const nome = row.profiles?.nome ?? ''
        if (!nome.toLowerCase().includes(filtros.operador.toLowerCase())) return false
      }
      if (filtros.veredito) {
        const v = filtros.veredito as string
        if (v === 'cpf_nao_encontrado' || v === 'erro_sistema') {
          if (row.tipo_resultado !== v) return false
        } else {
          if (row.veredito !== v) return false
        }
      }
      if (filtros.dataInicio && row.criado_em < filtros.dataInicio) return false
      if (filtros.dataFim && row.criado_em > filtros.dataFim + 'T23:59:59') return false
      return true
    })
  }, [rows, filtros])

  const totalPaginas = Math.max(1, Math.ceil(rowsFiltrados.length / POR_PAGINA))
  const rowsPagina   = rowsFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  function setFiltros(parcial: Partial<FiltrosHistorico>) {
    setFiltrosState(prev => ({ ...prev, ...parcial }))
    setPagina(1)
  }

  return {
    rows: rowsPagina,
    rowsFiltrados,
    loading,
    error,
    filtros,
    setFiltros,
    pagina,
    setPagina,
    totalPaginas,
    operadores,
    loadDadosExtras,
  }
}
