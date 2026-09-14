import {
  Veredito, DadosExtras,
  NivelSocioeconomico, ProcessosJudiciais, AntecedentesCriminais, AssistenciaSocial,
} from '../types'

export type TipoMoradia = 'nao_informado' | 'propria' | 'familiar' | 'alugada'
export type RecomendacaoNivel = 'RECOMENDADO' | 'CONDICIONAL' | 'NAO_RECOMENDADO'

export interface FormExtra {
  nomeCliente: string
  tipoMoradia: TipoMoradia
  valor: number
  parcelas: number
  finalidade: string
  temComprovante: boolean
  temIndicacao: boolean
  jaECliente: boolean
}

export interface Recomendacao {
  nivel: RecomendacaoNivel
  titulo: string
  fatoresPositivos: string[]
  fatoresNegativos: string[]
  condicoes: string[]
}

export function calcularRecomendacao(
  score: number,
  veredito: Veredito,
  extra: FormExtra,
  dadosExtras: DadosExtras
): Recomendacao {
  const { tipoMoradia, valor, parcelas, temComprovante, temIndicacao, jaECliente } = extra
  const positivos: string[] = []
  const negativos: string[] = []
  const condicoes: string[] = []

  if (veredito === 'NEGADO') {
    return {
      nivel: 'NAO_RECOMENDADO',
      titulo: 'Crediário não recomendado',
      fatoresPositivos: [],
      fatoresNegativos: [
        `Score ${score} abaixo do mínimo — alto risco de inadimplência`,
        'Histórico negativo identificado na consulta de crédito',
      ],
      condicoes: [],
    }
  }

  let pts = veredito === 'APROVADO' ? 60 : 30

  if (score >= 851)      { pts += 10; positivos.push(`Score ${score} — excelente histórico`) }
  else if (score >= 701) { positivos.push(`Score ${score} — baixo risco de inadimplência`) }
  else                   { negativos.push(`Score ${score} — risco moderado`) }

  if (tipoMoradia === 'propria')       { pts += 15; positivos.push('Imóvel próprio — estabilidade financeira') }
  else if (tipoMoradia === 'familiar') { pts += 5;  positivos.push('Moradia com familiar') }
  else if (tipoMoradia === 'alugada')  { pts -= 5;  negativos.push('Moradia alugada — compromisso fixo') }

  if (temComprovante) { pts += 15; positivos.push('Comprovante de renda apresentado') }
  else                { pts -= 10; negativos.push('Sem comprovante de renda') }

  if (temIndicacao) { pts += 10; positivos.push('Indicado por cliente da loja') }
  if (jaECliente)   { pts += 5;  positivos.push('Já é cliente da loja') }

  const parcelaValor = parcelas > 0 && valor > 0 ? valor / parcelas : 0
  if (parcelaValor > 500)      { pts -= 15; negativos.push(`Parcela R$ ${parcelaValor.toFixed(0)}/mês — valor elevado`) }
  else if (parcelaValor > 200) { pts -= 5;  negativos.push(`Parcela R$ ${parcelaValor.toFixed(0)}/mês`) }
  else if (parcelaValor > 0)   { pts += 5;  positivos.push(`Parcela R$ ${parcelaValor.toFixed(0)}/mês — valor adequado`) }

  if (valor > 5000)      { pts -= 15; negativos.push('Valor total acima de R$ 5.000') }
  else if (valor > 2000) { pts -= 5;  negativos.push('Valor total acima de R$ 2.000') }

  const socio = dadosExtras['nivel-socioeconomico']
  if (socio && !('erro' in socio)) {
    const s = socio as NivelSocioeconomico
    if (s.classeSocial === 'A' || s.classeSocial === 'B') { pts += 10; positivos.push(`Classe social ${s.classeSocial} — renda elevada`) }
    else if (s.classeSocial === 'D' || s.classeSocial === 'E') { pts -= 10; negativos.push(`Classe social ${s.classeSocial} — renda baixa`) }
  }

  const proc = dadosExtras['processos-agrupada']
  if (proc && !('erro' in proc)) {
    const p = proc as ProcessosJudiciais
    const total = p.totalProcessos ?? 0
    const valorReu = p.resumoProcessos?.valorTotalComoReu ?? 0
    if (total === 0)     { pts += 5;  positivos.push('Sem processos judiciais') }
    else if (total <= 2) { pts -= 5;  negativos.push(`${total} processo(s) judicial(is)`) }
    else                 { pts -= 15; negativos.push(`${total} processos judiciais`) }
    if (valorReu > 10000) { pts -= 10; negativos.push(`R$ ${valorReu.toLocaleString('pt-BR')} em ações como réu`) }
  }

  const ant = dadosExtras['antecedentes-federais']
  if (ant && !('erro' in ant)) {
    const a = ant as AntecedentesCriminais
    if (a.possuiAntecedentesCriminais === true)       { pts -= 30; negativos.push('Antecedentes criminais — Polícia Federal') }
    else if (a.possuiAntecedentesCriminais === false)  { pts += 5;  positivos.push('Sem antecedentes criminais (PF)') }
  }

  const assist = dadosExtras['assistencia-social-pf']
  if (assist && !('erro' in assist)) {
    const a = assist as AssistenciaSocial
    if (a.bpc)          positivos.push('Recebe BPC — renda garantida')
    if (a.bolsaFamilia) positivos.push('Beneficiário Bolsa Família')
  }

  if (veredito === 'APROVADO') {
    if (pts >= 75) return { nivel: 'RECOMENDADO', titulo: 'Crediário recomendado', fatoresPositivos: positivos, fatoresNegativos: negativos, condicoes }
    if (pts >= 40) {
      if (!temComprovante) condicoes.push('Solicitar comprovante de renda')
      if (parcelaValor > 300) condicoes.push('Avaliar redução do número de parcelas')
      return { nivel: 'CONDICIONAL', titulo: 'Crediário com condições', fatoresPositivos: positivos, fatoresNegativos: negativos, condicoes }
    }
    condicoes.push('Exigir comprovante de renda')
    condicoes.push('Encaminhar para aprovação do gerente')
    return { nivel: 'NAO_RECOMENDADO', titulo: 'Crediário não recomendado', fatoresPositivos: positivos, fatoresNegativos: negativos, condicoes }
  }

  if (pts >= 50) {
    if (!temComprovante) condicoes.push('Exigir comprovante de renda')
    if (!temIndicacao)   condicoes.push('Buscar referência de outro cliente')
    condicoes.push('Aprovação obrigatória pelo gerente')
    return { nivel: 'CONDICIONAL', titulo: 'Análise manual necessária', fatoresPositivos: positivos, fatoresNegativos: negativos, condicoes }
  }

  return { nivel: 'NAO_RECOMENDADO', titulo: 'Crediário não recomendado', fatoresPositivos: positivos, fatoresNegativos: negativos, condicoes }
}
