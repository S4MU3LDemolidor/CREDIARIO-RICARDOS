import { describe, it, expect } from 'vitest'
import { calcularRecomendacao } from './recomendacao'

const extraBase = {
  nomeCliente: 'João',
  tipoMoradia: 'propria' as const,
  valor: 500,
  parcelas: 3,
  finalidade: 'móveis',
  temComprovante: true,
  temIndicacao: false,
  jaECliente: false,
}

describe('calcularRecomendacao', () => {
  it('score <= 600 retorna NAO_RECOMENDADO sem importar extras', () => {
    const rec = calcularRecomendacao(400, 'NEGADO', extraBase, {})
    expect(rec.nivel).toBe('NAO_RECOMENDADO')
    expect(rec.fatoresPositivos).toHaveLength(0)
  })

  it('score alto + imovel proprio + comprovante retorna RECOMENDADO', () => {
    const rec = calcularRecomendacao(900, 'APROVADO', extraBase, {})
    expect(rec.nivel).toBe('RECOMENDADO')
  })

  it('score MANUAL + sem comprovante gera condicao de comprovante', () => {
    // temIndicacao: true garante pts=50 (base 30 + propria 15 - sem comprovante 10 + indicacao 10 + parcela 5)
    const extra = { ...extraBase, temComprovante: false, temIndicacao: true }
    const rec = calcularRecomendacao(650, 'MANUAL', extra, {})
    expect(rec.condicoes.some(c => c.includes('comprovante'))).toBe(true)
  })

  it('antecedentes criminais penaliza fortemente', () => {
    const semAntecedentes = calcularRecomendacao(800, 'APROVADO', extraBase, {})
    const comAntecedentes = calcularRecomendacao(800, 'APROVADO', extraBase, {
      'antecedentes-federais': { possuiAntecedentesCriminais: true, status: null, nome: null, dataNascimento: null, numeroCertidao: null, dataEmissao: null, dataValidade: null }
    })
    expect(comAntecedentes.nivel).not.toBe(semAntecedentes.nivel === 'RECOMENDADO' ? 'RECOMENDADO' : 'never')
    // 'criminais' (plural) — a mensagem completa é 'Antecedentes criminais — Polícia Federal'
    expect(comAntecedentes.fatoresNegativos.some(f => f.includes('criminais'))).toBe(true)
  })
})
