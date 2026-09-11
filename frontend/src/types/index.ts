export type Veredito = 'APROVADO' | 'MANUAL' | 'NEGADO'
export type TipoResultado = 'ok' | 'cpf_nao_encontrado' | 'erro_sistema'

export type ResultadoOk = {
  tipo: 'ok'
  veredito: Veredito
  score: number
  faixa: string | null
  cache_hit: boolean
  cache_data?: string
}

export type ResultadoCPFNaoEncontrado = {
  tipo: 'cpf_nao_encontrado'
}

export type ResultadoErroSistema = {
  tipo: 'erro_sistema'
  motivo: string
}

export type Resultado = ResultadoOk | ResultadoCPFNaoEncontrado | ResultadoErroSistema

export type Loja = {
  id: string
  nome: string
  criado_em: string
}

export type Profile = {
  id: string
  nome: string
  loja_id: string
  criado_em: string
  lojas: { nome: string } | null
}

export type ConsultaRow = {
  id: string
  cpf: string
  tipo_resultado: TipoResultado
  score: number | null
  veredito: Veredito | null
  faixa: string | null
  motivo_erro: string | null
  loja_id: string
  operador_id: string
  documento_conferido: boolean
  forcou_nova: boolean
  motivo_forca: string | null
  criado_em: string
  profiles: { nome: string } | null
}
