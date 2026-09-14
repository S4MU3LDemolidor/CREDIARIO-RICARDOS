export type Veredito = 'APROVADO' | 'MANUAL' | 'NEGADO'
export type TipoResultado = 'ok' | 'cpf_nao_encontrado' | 'erro_sistema'

// ─── Tipos de resposta de cada API extra ─────────────────────────────────────

export type NivelSocioeconomico = {
  classeSocial: string | null
  escolaridade: string | null
  cbo: string | null
  rendaEstimada: string | null
  rendaFaixaSalarial: string | null
  rendaIBGE: string | null
  rendaMediaCBO: string | null
  rendaMinimaCBO: string | null
  rendaMaximaCBO: string | null
  perfilDomiciliar?: {
    tipoDomicilio: string | null
    rendaPerCapita: string | null
    rendaDomiciliar: string | null
    quantidadeAdultos: number | null
    quantidadeMenores: number | null
    quantidadeMoradores: number | null
    classeSocialFamiliar: string | null
    faixaRendaPerCapita: string | null
  } | null
}

export type ProcessosJudiciais = {
  totalProcessos: number | null
  resumoProcessos?: {
    comoReu: number
    comoAutor: number
    poloIndeterminado: number
    valorTotalComoReu: number
  } | null
  segmentos?: Array<{ segmento: string | null; totalPorSegmento: number | null }> | null
  areasDireito?: Array<{
    areaDireito: string | null
    tipoAreaDireito: string | null
    totalProcessosArea: number | null
    totalValorProcessosArea: string | null
  }> | null
  distribuicaoPorAno?: Array<{ ano: string | null; totalPorAno: number | null }> | null
}

export type AntecedentesCriminais = {
  possuiAntecedentesCriminais: boolean | null
  status: string | null
  nome: string | null
  dataNascimento: string | null
  numeroCertidao: string | null
  dataEmissao: string | null
  dataValidade: string | null
}

export type ValidacaoCadastral = {
  name: string | null
  age: number | null
  gender: string | null
  dateOfBirth: string | null
  nameMother: string | null
  phones?: Array<{ phoneNumber: string | null; phoneType: string | null }> | null
  addresses?: Array<{
    street: string | null
    number: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    neighborhood: string | null
  }> | null
  salaryRange: string | null
  estimatedSalary: string | null
}

export type CadastroPF = {
  nome: string | null
  sexo: string | null
  dataNascimento: string | null
  idade: number | null
  obito: boolean | null
  nomeMae: string | null
  situacaoCadastral: string | null
  classeSocial: string | null
  rendaEstimada: string | null
  rendaFaixaSalarial: string | null
  cbo: string | null
  telefones?: Array<{ telefoneComDDD: string | null; tipoTelefone: string | null }> | null
  enderecos?: Array<{
    logradouro: string | null
    numero: string | null
    bairro: string | null
    cidade: string | null
    uf: string | null
    cep: string | null
  }> | null
  perfilDomiciliar?: {
    tipoDomicilio: string | null
    rendaPerCapita: string | null
    rendaDomiciliar: string | null
    quantidadeAdultos: number | null
    quantidadeMenores: number | null
    quantidadeMoradores: number | null
    classeSocialFamiliar: string | null
  } | null
}

export type AssistenciaSocial = {
  bolsaFamilia: boolean | null
  bpc: boolean | null
  auxilioEmergencial: boolean | null
  auxilioReconstrucao: boolean | null
  garantiaSafra: boolean | null
  seguroDefeso: boolean | null
}

export type BoaVistaAcertaPF = {
  decisao?: {
    descricao?: string | null
    codigoSituacao?: string | null
  } | null
  scores?: {
    ocorrencias?: Array<{
      score?: string | null
      risco?: string | null
      descricaoScore?: string | null
      probabilidadeInadimplencia?: string | null
      classificacaoABC?: string | null
    }> | null
    quantidadeOcorrencias?: string | null
  } | null
  classeSocial?: string | null
  rendaPresumida?: {
    descricao?: string | null
    faixa?: string | null
    valorPresumido?: string | null
  } | null
  pendenciasFinanceiras?: {
    quantidadeOcorrencia?: string | null
    valorTotal?: string | null
    totalCredores?: string | null
  } | null
  restricoes?: {
    quantidadeOcorrencias?: string | null
  } | null
  protestos?: {
    quantidadeOcorrencia?: string | null
    valorTotal?: string | null
  } | null
  chequeSemFundoBacen?: {
    quantidadeOcorrencia?: string | null
  } | null
}

export type ProtestosBrasil = {
  constamProtestos?: boolean | null
  numeroTotalProtestos?: number | null
  valorTotalProtestos?: string | null
  protestos?: Array<{
    estado?: string | null
    numeroTotalProtestosUF?: number | null
    valorTotalProtestosEstado?: string | null
    cartorios?: Array<{
      cidade?: string | null
      numeroProtestos?: number | null
      valorTotalProtestosCartorio?: string | null
    }> | null
  }> | null
}

export type ApiErro = { erro: string }

export type DadosExtras = Partial<{
  'nivel-socioeconomico': NivelSocioeconomico | ApiErro
  'processos-agrupada': ProcessosJudiciais | ApiErro
  'antecedentes-federais': AntecedentesCriminais | ApiErro
  'registration-brazil': ValidacaoCadastral | ApiErro
  'cadastro-pf-plus': CadastroPF | ApiErro
  'assistencia-social-pf': AssistenciaSocial | ApiErro
  'boa-vista-acerta-pf': BoaVistaAcertaPF | ApiErro
  'protestos-brasil': ProtestosBrasil | ApiErro
}>

// ─── Resultado principal ──────────────────────────────────────────────────────

export type ResultadoOk = {
  tipo: 'ok'
  veredito: Veredito
  score: number
  faixa: string | null
  capacidadePagamento: string | null
  perfil: string | null
  cache_hit: boolean
  cache_data?: string
  dadosExtras: DadosExtras
}

export type ResultadoCPFNaoEncontrado = { tipo: 'cpf_nao_encontrado' }
export type ResultadoErroSistema = { tipo: 'erro_sistema'; motivo: string }
export type Resultado = ResultadoOk | ResultadoCPFNaoEncontrado | ResultadoErroSistema

// ─── Entidades ────────────────────────────────────────────────────────────────

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
  dados_extras: DadosExtras | null
  apis_utilizadas: string[] | null
}
