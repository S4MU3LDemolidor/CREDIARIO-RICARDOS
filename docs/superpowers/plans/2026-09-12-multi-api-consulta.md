# Multi-API Consulta de Crédito — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o operador selecione múltiplas APIs da FonteData antes de consultar, exibindo os resultados de cada uma de forma clara com custo visível, e usar os dados extras para enriquecer o algoritmo de recomendação.

**Architecture:** A Edge Function `consultar-cpf` recebe `apis_extras[]` no body e chama todas em paralelo via `Promise.all`. O score-credito-quod mantém cache de 30 dias; as extras são sempre chamadas fresh. O frontend tem uma seção "Análises Adicionais" no formulário com checkboxes mostrando descrição e preço de cada API. Os resultados são exibidos em seções colapsáveis por API. O algoritmo de recomendação usa os dados extras disponíveis para ajustar a pontuação.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Supabase Edge Functions (Deno), FonteData API

---

## Mapa de arquivos

```
supabase/
  migrations/
    20260912000002_add_dados_extras.sql   -- ADD COLUMN apis_utilizadas, dados_extras
  functions/
    consultar-cpf/
      index.ts                            -- chamarApi() helper + Promise.all para extras

frontend/src/
  types/index.ts                          -- NivelSocioeconomico, ProcessosJudiciais,
                                          -- AntecedentesCriminais, ValidacaoCadastral,
                                          -- CadastroPF, AssistenciaSocial, DadosExtras
                                          -- ResultadoOk agora inclui dadosExtras
  hooks/
    useConsulta.ts                        -- consultar() aceita apisExtras[], nomeCliente
  pages/
    Consulta.tsx                          -- API_OPCOES constant, API selector section,
                                          -- display components por API,
                                          -- algoritmo recomendação atualizado
```

---

## Task 1: Migração do banco

**Files:**
- Create: `supabase/migrations/20260912000002_add_dados_extras.sql`

- [ ] **Step 1: Criar migration**

```sql
ALTER TABLE consultas
  ADD COLUMN IF NOT EXISTS apis_utilizadas text[],
  ADD COLUMN IF NOT EXISTS dados_extras    jsonb;
```

- [ ] **Step 2: Rodar no SQL Editor do Supabase**

No painel: SQL Editor → New query → cole o conteúdo → Run.
Esperado: `ALTER TABLE` sem erros.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260912000002_add_dados_extras.sql
git commit -m "feat: add apis_utilizadas and dados_extras columns to consultas"
```

---

## Task 2: Tipos TypeScript

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Reescrever types/index.ts com todos os tipos de resposta**

```typescript
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

export type ApiErro = { erro: string }

export type DadosExtras = Partial<{
  'nivel-socioeconomico': NivelSocioeconomico | ApiErro
  'processos-agrupada': ProcessosJudiciais | ApiErro
  'antecedentes-federais': AntecedentesCriminais | ApiErro
  'registration-brazil': ValidacaoCadastral | ApiErro
  'cadastro-pf-plus': CadastroPF | ApiErro
  'assistencia-social-pf': AssistenciaSocial | ApiErro
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
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat: add multi-API response types and DadosExtras"
```

---

## Task 3: Hook useConsulta

**Files:**
- Modify: `frontend/src/hooks/useConsulta.ts`

- [ ] **Step 1: Atualizar hook para aceitar apisExtras e nomeCliente**

```typescript
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Resultado } from '../types'

type ConsultaState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'resultado'; data: Resultado }

export function useConsulta() {
  const [state, setState] = useState<ConsultaState>({ status: 'idle' })

  async function consultar(
    cpf: string,
    documentoConferido: boolean,
    apisExtras: string[] = [],
    nomeCliente: string = '',
    motivoForca?: string
  ) {
    setState({ status: 'loading' })

    const { data, error } = await supabase.functions.invoke('consultar-cpf', {
      body: {
        cpf,
        documento_conferido: documentoConferido,
        apis_extras: apisExtras,
        nome_cliente: nomeCliente,
        ...(motivoForca ? { motivo_forca: motivoForca } : {}),
      },
    })

    if (error) {
      setState({
        status: 'resultado',
        data: { tipo: 'erro_sistema', motivo: error.message },
      })
    } else {
      setState({ status: 'resultado', data: data as Resultado })
    }
  }

  function reset() {
    setState({ status: 'idle' })
  }

  return { state, consultar, reset }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useConsulta.ts
git commit -m "feat: extend useConsulta to support apisExtras and nomeCliente"
```

---

## Task 4: Edge Function multi-API

**Files:**
- Modify: `supabase/functions/consultar-cpf/index.ts`

- [ ] **Step 1: Reescrever a Edge Function**

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SLUGS_PERMITIDOS = new Set([
  'nivel-socioeconomico',
  'processos-agrupada',
  'antecedentes-federais',
  'registration-brazil',
  'cadastro-pf-plus',
  'assistencia-social-pf',
])

export function aplicarRegra(score: number): 'APROVADO' | 'MANUAL' | 'NEGADO' {
  if (score <= 600) return 'NEGADO'
  if (score <= 700) return 'MANUAL'
  return 'APROVADO'
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function chamarApiExtra(
  slug: string,
  cpf: string,
  apiKey: string,
  extraParams: Record<string, string> = {}
): Promise<unknown> {
  const url = new URL(`https://app.fontedata.com/api/v1/consulta/${slug}`)
  url.searchParams.set('cpf', cpf)
  for (const [k, v] of Object.entries(extraParams)) {
    if (v) url.searchParams.set(k, v)
  }
  try {
    const r = await fetch(url.toString(), { headers: { 'X-API-Key': apiKey } })
    if (r.ok) return await r.json()
    return { erro: `HTTP ${r.status}` }
  } catch {
    return { erro: 'Falha de rede' }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ tipo: 'erro_sistema', motivo: 'Nao autorizado' }, 401)

  const supabaseUrl     = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const fontedataApiKey = Deno.env.get('FONTEDATA_API_KEY')!
  const cacheDias       = parseInt(Deno.env.get('CACHE_DIAS') ?? '30', 10)

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user) return jsonResponse({ tipo: 'erro_sistema', motivo: 'Sessao invalida' }, 401)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('loja_id')
    .eq('id', user.id)
    .single()
  if (profileError || !profile) {
    return jsonResponse({ tipo: 'erro_sistema', motivo: 'Perfil do operador nao encontrado' }, 403)
  }

  let body: {
    cpf: string
    documento_conferido: boolean
    motivo_forca?: string
    apis_extras?: string[]
    nome_cliente?: string
  }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ tipo: 'erro_sistema', motivo: 'Payload invalido' }, 400)
  }

  const {
    cpf,
    documento_conferido,
    motivo_forca,
    apis_extras = [],
    nome_cliente = '',
  } = body

  const cpfDigits = cpf.replace(/\D/g, '')
  if (cpfDigits.length !== 11) {
    return jsonResponse({ tipo: 'erro_sistema', motivo: 'CPF deve ter 11 digitos' }, 400)
  }

  // Filtrar apenas slugs permitidos
  const slugsExtras = apis_extras.filter(s => SLUGS_PERMITIDOS.has(s))

  // ── Verificar cache do score ──────────────────────────────────────────────
  let scoreFromCache = false
  let scoreData: {
    score: number
    veredito: string
    faixa: string | null
    capacidade_pagamento: string | null
    perfil_credito: string | null
    criado_em: string
  } | null = null

  if (!motivo_forca) {
    const cacheLimit = new Date()
    cacheLimit.setDate(cacheLimit.getDate() - cacheDias)

    const { data: cached } = await supabase
      .from('consultas')
      .select('score, veredito, faixa, capacidade_pagamento, perfil_credito, criado_em')
      .eq('cpf', cpfDigits)
      .eq('tipo_resultado', 'ok')
      .gte('criado_em', cacheLimit.toISOString())
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cached && typeof cached.score === 'number') {
      scoreFromCache = true
      scoreData = cached
    }
  }

  // ── Consultar score-credito-quod se não há cache ──────────────────────────
  let scoreApiResult: {
    score: number
    veredito: string
    faixa: string | null
    capacidadePagamento: string | null
    perfil: string | null
  } | null = null

  if (!scoreFromCache) {
    const apiRes = await fetch(
      `https://app.fontedata.com/api/v1/consulta/score-credito-quod?cpf=${cpfDigits}`,
      { headers: { 'X-API-Key': fontedataApiKey } }
    )

    if (apiRes.status === 404) {
      await supabase.from('consultas').insert({
        cpf: cpfDigits,
        tipo_resultado: 'cpf_nao_encontrado',
        score: null, veredito: null, faixa: null,
        capacidade_pagamento: null, perfil_credito: null,
        motivo_erro: null,
        loja_id: profile.loja_id,
        operador_id: user.id,
        documento_conferido,
        forcou_nova: !!motivo_forca,
        motivo_forca: motivo_forca ?? null,
        apis_utilizadas: ['score-credito-quod', ...slugsExtras],
        dados_extras: null,
      })
      return jsonResponse({ tipo: 'cpf_nao_encontrado' })
    }

    if (apiRes.status === 403) {
      return jsonResponse({ tipo: 'erro_sistema', motivo: 'Saldo insuficiente na conta FonteData' })
    }

    if (apiRes.status !== 200) {
      return jsonResponse({ tipo: 'erro_sistema', motivo: `Erro inesperado da API (HTTP ${apiRes.status})` })
    }

    const apiData = await apiRes.json()
    const score = apiData?.pessoaFisica?.score
    if (typeof score !== 'number') {
      return jsonResponse({ tipo: 'erro_sistema', motivo: 'Resposta da API sem score numerico' })
    }

    scoreApiResult = {
      score,
      veredito: aplicarRegra(score),
      faixa: apiData?.pessoaFisica?.faixaScore ?? null,
      capacidadePagamento: apiData?.pessoaFisica?.capacidadePagamento ?? null,
      perfil: apiData?.pessoaFisica?.perfil ?? null,
    }
  }

  // ── Chamar APIs extras em paralelo ────────────────────────────────────────
  const dadosExtras: Record<string, unknown> = {}

  if (slugsExtras.length > 0) {
    await Promise.all(
      slugsExtras.map(async (slug) => {
        const extraParams: Record<string, string> = {}
        if (slug === 'antecedentes-federais' && nome_cliente) {
          extraParams['nome'] = nome_cliente
        }
        dadosExtras[slug] = await chamarApiExtra(slug, cpfDigits, fontedataApiKey, extraParams)
      })
    )
  }

  // ── Montar valores finais ─────────────────────────────────────────────────
  const score     = scoreFromCache ? scoreData!.score          : scoreApiResult!.score
  const veredito  = scoreFromCache ? scoreData!.veredito       : scoreApiResult!.veredito
  const faixa     = scoreFromCache ? scoreData!.faixa          : scoreApiResult!.faixa
  const capPag    = scoreFromCache ? scoreData!.capacidade_pagamento : scoreApiResult!.capacidadePagamento
  const perfil    = scoreFromCache ? scoreData!.perfil_credito : scoreApiResult!.perfil

  // ── Gravar no log (apenas quando score foi consultado, não quando veio de cache) ──
  if (!scoreFromCache) {
    await supabase.from('consultas').insert({
      cpf: cpfDigits,
      tipo_resultado: 'ok',
      score,
      veredito,
      faixa,
      capacidade_pagamento: capPag,
      perfil_credito: perfil,
      motivo_erro: null,
      loja_id: profile.loja_id,
      operador_id: user.id,
      documento_conferido,
      forcou_nova: !!motivo_forca,
      motivo_forca: motivo_forca ?? null,
      apis_utilizadas: ['score-credito-quod', ...slugsExtras],
      dados_extras: Object.keys(dadosExtras).length > 0 ? dadosExtras : null,
    })
  }

  return jsonResponse({
    tipo: 'ok',
    veredito,
    score,
    faixa,
    capacidadePagamento: capPag,
    perfil,
    cache_hit: scoreFromCache,
    cache_data: scoreFromCache ? scoreData!.criado_em : undefined,
    dadosExtras,
  })
})
```

- [ ] **Step 2: Deploy da Edge Function**

```bash
supabase functions deploy consultar-cpf
```

Esperado: `Deployed consultar-cpf` sem erros.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/consultar-cpf/index.ts
git commit -m "feat: edge function calls multiple FonteData APIs in parallel"
```

---

## Task 5: Frontend — API Selector + Result Display

**Files:**
- Modify: `frontend/src/pages/Consulta.tsx`

Esta task é a maior. Reescrever Consulta.tsx com:
1. `API_OPCOES` constant com os 6 módulos
2. Estado para APIs selecionadas
3. Seção "Análises Adicionais" no formulário
4. Componentes de display para resultado de cada API
5. Algoritmo de recomendação atualizado com dados extras

- [ ] **Step 1: Reescrever Consulta.tsx**

```tsx
import { useState } from 'react'
import { Header } from '../components/Header'
import { Spinner } from '../components/Spinner'
import { VeredittoBadge, scoreColor } from '../components/Badge'
import { ForcarNovaModal } from '../components/ForcarNovaModal'
import { useConsulta } from '../hooks/useConsulta'
import { formatCPF, stripCPF, isValidCPF, formatDate } from '../lib/formatters'
import {
  ResultadoOk, Veredito, DadosExtras,
  NivelSocioeconomico, ProcessosJudiciais, AntecedentesCriminais,
  ValidacaoCadastral, CadastroPF, AssistenciaSocial, ApiErro,
} from '../types'

// ─── Configuração das APIs disponíveis ────────────────────────────────────────

const SCORE_CUSTO = 2.34

const API_OPCOES = [
  {
    slug: 'nivel-socioeconomico',
    nome: 'Nível Socioeconômico e Renda',
    descricao: 'Classe social (A–E), renda estimada, ocupação (CBO), escolaridade e perfil do domicílio familiar',
    preco: 0.43,
    padrao: true,
  },
  {
    slug: 'cadastro-pf-plus',
    nome: 'Cadastro Pessoal Completo',
    descricao: 'Nome, data de nascimento, endereços, telefones, e-mails, situação cadastral na Receita Federal e vínculos familiares',
    preco: 0.72,
    padrao: false,
  },
  {
    slug: 'registration-brazil',
    nome: 'Validação Cadastral (Antifraude)',
    descricao: 'Confirma identidade, endereços e faixa salarial. Detecta inconsistências cadastrais e riscos de fraude',
    preco: 0.43,
    padrao: false,
  },
  {
    slug: 'processos-agrupada',
    nome: 'Processos Judiciais – Resumo',
    descricao: 'Total de processos como réu e autor, valor das ações, distribuição por área do direito (cível, trabalhista, criminal) e por ano',
    preco: 1.65,
    padrao: false,
  },
  {
    slug: 'antecedentes-federais',
    nome: 'Antecedentes Criminais – Polícia Federal',
    descricao: 'Certidão nacional da PF via SINIC — indica se há decisão condenatória com trânsito em julgado registrada',
    preco: 0.60,
    padrao: false,
  },
  {
    slug: 'assistencia-social-pf',
    nome: 'Benefícios Sociais',
    descricao: 'Indica se recebe Bolsa Família, BPC, Auxílio Emergencial, Garantia-Safra e Seguro-Defeso (últimos 12 meses)',
    preco: 1.07,
    padrao: false,
  },
] as const

type ApiSlug = typeof API_OPCOES[number]['slug']

// ─── Tipos locais do formulário ────────────────────────────────────────────────

type TipoMoradia = 'nao_informado' | 'propria' | 'familiar' | 'alugada'
type RecomendacaoNivel = 'RECOMENDADO' | 'CONDICIONAL' | 'NAO_RECOMENDADO'

interface FormExtra {
  nomeCliente: string
  tipoMoradia: TipoMoradia
  valor: number
  parcelas: number
  finalidade: string
  temComprovante: boolean
  temIndicacao: boolean
  primeiraCompra: boolean
}

interface Recomendacao {
  nivel: RecomendacaoNivel
  titulo: string
  fatoresPositivos: string[]
  fatoresNegativos: string[]
  condicoes: string[]
}

// ─── Algoritmo de recomendação ─────────────────────────────────────────────────

function calcularRecomendacao(
  score: number,
  veredito: Veredito,
  extra: FormExtra,
  dadosExtras: DadosExtras
): Recomendacao {
  const { tipoMoradia, valor, parcelas, temComprovante, temIndicacao, primeiraCompra } = extra
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

  // Score base
  if (score >= 851) { pts += 10; positivos.push(`Score ${score} — excelente histórico`) }
  else if (score >= 701) { positivos.push(`Score ${score} — baixo índice de inadimplência`) }
  else { negativos.push(`Score ${score} — risco moderado`) }

  // Moradia (formulário)
  if (tipoMoradia === 'propria')    { pts += 15; positivos.push('Imóvel próprio — estabilidade financeira') }
  else if (tipoMoradia === 'familiar') { pts += 5; positivos.push('Moradia com familiar') }
  else if (tipoMoradia === 'alugada')  { pts -= 5; negativos.push('Moradia alugada — compromisso financeiro fixo') }

  // Comprovante (formulário)
  if (temComprovante) { pts += 15; positivos.push('Comprovante de renda apresentado') }
  else { pts -= 10; negativos.push('Sem comprovante de renda') }

  // Indicação (formulário)
  if (temIndicacao) { pts += 10; positivos.push('Indicado por cliente da loja') }

  // Histórico na loja (formulário)
  if (!primeiraCompra) { pts += 5; positivos.push('Já é cliente da loja') }
  else { negativos.push('Primeira compra — sem histórico interno') }

  // Parcela mensal (formulário)
  const parcelaValor = parcelas > 0 && valor > 0 ? valor / parcelas : 0
  if (parcelaValor > 500)      { pts -= 15; negativos.push(`Parcela de R$ ${parcelaValor.toFixed(0)}/mês — valor elevado`) }
  else if (parcelaValor > 200) { pts -= 5;  negativos.push(`Parcela de R$ ${parcelaValor.toFixed(0)}/mês`) }
  else if (parcelaValor > 0)   { pts += 5;  positivos.push(`Parcela de R$ ${parcelaValor.toFixed(0)}/mês — valor adequado`) }

  // Valor total (formulário)
  if (valor > 5000)      { pts -= 15; negativos.push('Valor total acima de R$ 5.000') }
  else if (valor > 2000) { pts -= 5;  negativos.push('Valor total acima de R$ 2.000') }

  // ── Dados das APIs extras ────────────────────────────────────────────────

  // Nível socioeconômico
  const socio = dadosExtras['nivel-socioeconomico']
  if (socio && !('erro' in socio)) {
    const s = socio as NivelSocioeconomico
    if (s.classeSocial === 'A' || s.classeSocial === 'B') {
      pts += 10; positivos.push(`Classe social ${s.classeSocial} — renda elevada`)
    } else if (s.classeSocial === 'D' || s.classeSocial === 'E') {
      pts -= 10; negativos.push(`Classe social ${s.classeSocial} — renda baixa`)
    }
  }

  // Processos judiciais
  const proc = dadosExtras['processos-agrupada']
  if (proc && !('erro' in proc)) {
    const p = proc as ProcessosJudiciais
    const total = p.totalProcessos ?? 0
    const valorReu = p.resumoProcessos?.valorTotalComoReu ?? 0
    if (total === 0)    { pts += 5;  positivos.push('Sem processos judiciais registrados') }
    else if (total <= 2){ pts -= 5;  negativos.push(`${total} processo(s) judicial(is)`) }
    else                { pts -= 15; negativos.push(`${total} processos judiciais`) }
    if (valorReu > 10000) { pts -= 10; negativos.push(`R$ ${valorReu.toLocaleString('pt-BR')} em ações como réu`) }
  }

  // Antecedentes criminais
  const ant = dadosExtras['antecedentes-federais']
  if (ant && !('erro' in ant)) {
    const a = ant as AntecedentesCriminais
    if (a.possuiAntecedentesCriminais === true)  { pts -= 30; negativos.push('Antecedentes criminais na Polícia Federal') }
    else if (a.possuiAntecedentesCriminais === false) { pts += 5;  positivos.push('Sem antecedentes criminais (PF)') }
  }

  // Benefícios sociais — renda garantida, não penalizar
  const assist = dadosExtras['assistencia-social-pf']
  if (assist && !('erro' in assist)) {
    const a = assist as AssistenciaSocial
    if (a.bpc)          positivos.push('Recebe BPC — renda mensal garantida')
    if (a.bolsaFamilia) positivos.push('Beneficiário Bolsa Família')
  }

  // ── Decisão final ────────────────────────────────────────────────────────

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

  // MANUAL
  if (pts >= 50) {
    if (!temComprovante) condicoes.push('Exigir comprovante de renda')
    if (!temIndicacao)   condicoes.push('Buscar referência de outro cliente')
    condicoes.push('Aprovação obrigatória pelo gerente')
    return { nivel: 'CONDICIONAL', titulo: 'Análise manual necessária', fatoresPositivos: positivos, fatoresNegativos: negativos, condicoes }
  }

  return { nivel: 'NAO_RECOMENDADO', titulo: 'Crediário não recomendado', fatoresPositivos: positivos, fatoresNegativos: negativos, condicoes }
}

// ─── Helpers de UI ─────────────────────────────────────────────────────────────

function FormSection({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">{title}</span>
      <div className="flex-1 h-px bg-[#e8e6e1]" />
    </div>
  )
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative flex-shrink-0">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-4 h-4 border-2 border-gray-300 rounded peer-checked:bg-[#aa0000] peer-checked:border-[#aa0000] transition-all" />
        {checked && (
          <svg className="absolute inset-0 w-4 h-4 text-white p-0.5" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{label}</span>
    </label>
  )
}

function ScoreZoneBar({ score }: { score: number }) {
  const pct = (score / 1000) * 100
  return (
    <div className="space-y-1.5">
      <div className="relative w-full h-2 rounded-full overflow-hidden flex">
        <div className="bg-red-200"     style={{ width: '60%' }} />
        <div className="bg-amber-200"   style={{ width: '10%' }} />
        <div className="bg-emerald-200" style={{ width: '30%' }} />
        <div
          className="absolute top-1/2 w-3 h-3 rounded-full bg-[#111] border-2 border-white shadow"
          style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-300 px-0.5 select-none">
        <span>0</span>
        <span className="text-red-300">Alto risco</span>
        <span className="text-amber-300">Médio</span>
        <span className="text-emerald-400">Baixo risco</span>
        <span>1000</span>
      </div>
    </div>
  )
}

function RecomendacaoCard({ rec }: { rec: Recomendacao }) {
  const cfg = {
    RECOMENDADO:     { bg: 'bg-emerald-50', border: 'border-emerald-200', tc: 'text-emerald-800', icon: '✓', ib: 'bg-emerald-100 text-emerald-700' },
    CONDICIONAL:     { bg: 'bg-amber-50',   border: 'border-amber-200',   tc: 'text-amber-800',   icon: '!', ib: 'bg-amber-100 text-amber-700' },
    NAO_RECOMENDADO: { bg: 'bg-red-50',     border: 'border-red-200',     tc: 'text-[#aa0000]',   icon: '✕', ib: 'bg-red-100 text-[#aa0000]' },
  }[rec.nivel]

  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-xl p-5 space-y-3`}>
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 rounded-full ${cfg.ib} flex items-center justify-center text-xs font-bold shrink-0`}>
          {cfg.icon}
        </div>
        <p className={`font-semibold text-sm ${cfg.tc}`}>{rec.titulo}</p>
      </div>
      {rec.fatoresPositivos.length > 0 && (
        <div className="space-y-1">
          {rec.fatoresPositivos.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-emerald-700">
              <span className="shrink-0 mt-0.5">+</span><span>{f}</span>
            </div>
          ))}
        </div>
      )}
      {rec.fatoresNegativos.length > 0 && (
        <div className="space-y-1">
          {rec.fatoresNegativos.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
              <span className="shrink-0 mt-0.5 text-gray-400">−</span><span>{f}</span>
            </div>
          ))}
        </div>
      )}
      {rec.condicoes.length > 0 && (
        <div className="pt-3 border-t border-amber-200 space-y-1">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Condições para aprovação</p>
          {rec.condicoes.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
              <span className="shrink-0 mt-0.5">→</span><span>{c}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Componentes de display por API ───────────────────────────────────────────

function CardExtra({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[#e8e6e1] px-6 py-5 space-y-3">
      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">{titulo}</p>
      {children}
    </div>
  )
}

function Campo({ label, value }: { label: string; value: unknown }) {
  const display = value === null || value === undefined || value === '' ? '—' : String(value)
  return (
    <div className="flex justify-between items-baseline gap-2 py-1.5 border-b border-[#f0ede8] last:border-0">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className="text-xs text-gray-700 text-right font-medium">{display}</span>
    </div>
  )
}

function ApiErroBadge({ msg }: { msg: string }) {
  return <p className="text-xs text-gray-400 italic">{msg}</p>
}

function SecaoNivelSocioeconomico({ data }: { data: NivelSocioeconomico | ApiErro }) {
  if ('erro' in data) return <ApiErroBadge msg={`Erro: ${data.erro}`} />
  const d = data as NivelSocioeconomico
  return (
    <div className="space-y-0">
      <Campo label="Classe social"     value={d.classeSocial} />
      <Campo label="Renda estimada"    value={d.rendaEstimada} />
      <Campo label="Faixa salarial"    value={d.rendaFaixaSalarial} />
      <Campo label="Ocupação (CBO)"    value={d.cbo} />
      <Campo label="Escolaridade"      value={d.escolaridade} />
      <Campo label="Renda IBGE"        value={d.rendaIBGE} />
      <Campo label="Renda média CBO"   value={d.rendaMediaCBO} />
      {d.perfilDomiciliar && (
        <>
          <Campo label="Tipo domicílio"      value={d.perfilDomiciliar.tipoDomicilio} />
          <Campo label="Moradores"           value={d.perfilDomiciliar.quantidadeMoradores} />
          <Campo label="Adultos / Menores"   value={`${d.perfilDomiciliar.quantidadeAdultos ?? '?'} / ${d.perfilDomiciliar.quantidadeMenores ?? '?'}`} />
          <Campo label="Renda domiciliar"    value={d.perfilDomiciliar.rendaDomiciliar} />
          <Campo label="Renda per capita"    value={d.perfilDomiciliar.rendaPerCapita} />
          <Campo label="Classe familiar"     value={d.perfilDomiciliar.classeSocialFamiliar} />
        </>
      )}
    </div>
  )
}

function SecaoProcessos({ data }: { data: ProcessosJudiciais | ApiErro }) {
  if ('erro' in data) return <ApiErroBadge msg={`Erro: ${data.erro}`} />
  const d = data as ProcessosJudiciais
  const total = d.totalProcessos ?? 0
  const alertColor = total === 0 ? 'text-emerald-700' : total <= 2 ? 'text-amber-700' : 'text-[#aa0000]'
  return (
    <div className="space-y-3">
      <div className={`text-2xl font-display font-semibold ${alertColor}`}>
        {total} <span className="text-sm font-sans font-normal text-gray-400">processo(s)</span>
      </div>
      {d.resumoProcessos && (
        <div className="space-y-0">
          <Campo label="Como réu"    value={d.resumoProcessos.comoReu} />
          <Campo label="Como autor"  value={d.resumoProcessos.comoAutor} />
          <Campo label="Polo indet." value={d.resumoProcessos.poloIndeterminado} />
          {d.resumoProcessos.valorTotalComoReu > 0 && (
            <Campo label="Valor como réu" value={`R$ ${d.resumoProcessos.valorTotalComoReu.toLocaleString('pt-BR')}`} />
          )}
        </div>
      )}
      {d.areasDireito && d.areasDireito.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-2">Áreas do direito</p>
          {d.areasDireito.slice(0, 5).map((a, i) => (
            <div key={i} className="flex justify-between text-xs py-1 border-b border-[#f0ede8]">
              <span className="text-gray-500">{a.areaDireito}</span>
              <span className="text-gray-700 font-medium">{a.totalProcessosArea}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SecaoAntecedentes({ data }: { data: AntecedentesCriminais | ApiErro }) {
  if ('erro' in data) return <ApiErroBadge msg={`Erro: ${data.erro}`} />
  const d = data as AntecedentesCriminais
  const consta = d.possuiAntecedentesCriminais
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 text-sm font-semibold ${consta ? 'text-[#aa0000]' : 'text-emerald-700'}`}>
        <span>{consta ? '✕' : '✓'}</span>
        <span>{d.status ?? (consta ? 'CONSTA' : 'NÃO CONSTA')}</span>
      </div>
      <div className="space-y-0">
        <Campo label="Certidão n°"  value={d.numeroCertidao} />
        <Campo label="Emitida em"   value={d.dataEmissao} />
        <Campo label="Válida até"   value={d.dataValidade} />
        <Campo label="Nascimento"   value={d.dataNascimento} />
      </div>
    </div>
  )
}

function SecaoValidacaoCadastral({ data }: { data: ValidacaoCadastral | ApiErro }) {
  if ('erro' in data) return <ApiErroBadge msg={`Erro: ${data.erro}`} />
  const d = data as ValidacaoCadastral
  return (
    <div className="space-y-0">
      <Campo label="Nome"            value={d.name} />
      <Campo label="Idade"           value={d.age ? `${d.age} anos` : null} />
      <Campo label="Gênero"          value={d.gender} />
      <Campo label="Nascimento"      value={d.dateOfBirth} />
      <Campo label="Mãe"             value={d.nameMother} />
      <Campo label="Renda estimada"  value={d.estimatedSalary} />
      {d.phones && d.phones.length > 0 && (
        <Campo label="Telefone"      value={d.phones[0].phoneNumber} />
      )}
      {d.addresses && d.addresses.length > 0 && (
        <Campo
          label="Endereço"
          value={`${d.addresses[0].street}, ${d.addresses[0].number} — ${d.addresses[0].city}/${d.addresses[0].state}`}
        />
      )}
    </div>
  )
}

function SecaoCadastro({ data }: { data: CadastroPF | ApiErro }) {
  if ('erro' in data) return <ApiErroBadge msg={`Erro: ${data.erro}`} />
  const d = data as CadastroPF
  return (
    <div className="space-y-0">
      <Campo label="Nome"              value={d.nome} />
      <Campo label="Nascimento"        value={d.dataNascimento} />
      <Campo label="Idade"             value={d.idade ? `${d.idade} anos` : null} />
      <Campo label="Sexo"              value={d.sexo} />
      <Campo label="Mãe"               value={d.nomeMae} />
      <Campo label="Situação cadastral" value={d.situacaoCadastral} />
      <Campo label="Óbito"             value={d.obito === true ? 'Sim ⚠️' : d.obito === false ? 'Não' : null} />
      <Campo label="Classe social"     value={d.classeSocial} />
      <Campo label="Renda estimada"    value={d.rendaEstimada} />
      <Campo label="Faixa salarial"    value={d.rendaFaixaSalarial} />
      <Campo label="Ocupação (CBO)"    value={d.cbo} />
      {d.enderecos && d.enderecos.length > 0 && (
        <Campo
          label="Endereço"
          value={`${d.enderecos[0].logradouro}, ${d.enderecos[0].numero} — ${d.enderecos[0].cidade}/${d.enderecos[0].uf}`}
        />
      )}
      {d.telefones && d.telefones.length > 0 && (
        <Campo label="Telefone" value={d.telefones[0].telefoneComDDD} />
      )}
      {d.perfilDomiciliar && (
        <>
          <Campo label="Moradores"      value={d.perfilDomiciliar.quantidadeMoradores} />
          <Campo label="Renda domiciliar" value={d.perfilDomiciliar.rendaDomiciliar} />
          <Campo label="Classe familiar"  value={d.perfilDomiciliar.classeSocialFamiliar} />
        </>
      )}
    </div>
  )
}

function SecaoAssistenciaSocial({ data }: { data: AssistenciaSocial | ApiErro }) {
  if ('erro' in data) return <ApiErroBadge msg={`Erro: ${data.erro}`} />
  const d = data as AssistenciaSocial

  const beneficios = [
    { nome: 'Bolsa Família',       ativo: d.bolsaFamilia },
    { nome: 'BPC',                 ativo: d.bpc },
    { nome: 'Auxílio Emergencial', ativo: d.auxilioEmergencial },
    { nome: 'Auxílio Reconstrução',ativo: d.auxilioReconstrucao },
    { nome: 'Garantia-Safra',      ativo: d.garantiaSafra },
    { nome: 'Seguro-Defeso',       ativo: d.seguroDefeso },
  ]

  return (
    <div className="space-y-1.5">
      {beneficios.map((b, i) => (
        <div key={i} className="flex items-center gap-2.5 py-1 border-b border-[#f0ede8] last:border-0">
          <span className={`text-xs font-bold ${b.ativo ? 'text-emerald-600' : 'text-gray-300'}`}>
            {b.ativo ? '✓' : '−'}
          </span>
          <span className={`text-xs ${b.ativo ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
            {b.nome}
          </span>
        </div>
      ))}
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

  const secoesDados: { slug: ApiSlug; titulo: string; comp: React.ReactNode }[] = [
    data.dadosExtras['nivel-socioeconomico'] && {
      slug: 'nivel-socioeconomico' as ApiSlug,
      titulo: 'Nível Socioeconômico e Renda',
      comp: <SecaoNivelSocioeconomico data={data.dadosExtras['nivel-socioeconomico']!} />,
    },
    data.dadosExtras['processos-agrupada'] && {
      slug: 'processos-agrupada' as ApiSlug,
      titulo: 'Processos Judiciais',
      comp: <SecaoProcessos data={data.dadosExtras['processos-agrupada']!} />,
    },
    data.dadosExtras['antecedentes-federais'] && {
      slug: 'antecedentes-federais' as ApiSlug,
      titulo: 'Antecedentes Criminais – Polícia Federal',
      comp: <SecaoAntecedentes data={data.dadosExtras['antecedentes-federais']!} />,
    },
    data.dadosExtras['registration-brazil'] && {
      slug: 'registration-brazil' as ApiSlug,
      titulo: 'Validação Cadastral',
      comp: <SecaoValidacaoCadastral data={data.dadosExtras['registration-brazil']!} />,
    },
    data.dadosExtras['cadastro-pf-plus'] && {
      slug: 'cadastro-pf-plus' as ApiSlug,
      titulo: 'Cadastro Pessoal Completo',
      comp: <SecaoCadastro data={data.dadosExtras['cadastro-pf-plus']!} />,
    },
    data.dadosExtras['assistencia-social-pf'] && {
      slug: 'assistencia-social-pf' as ApiSlug,
      titulo: 'Benefícios Sociais',
      comp: <SecaoAssistenciaSocial data={data.dadosExtras['assistencia-social-pf']!} />,
    },
  ].filter(Boolean) as { slug: ApiSlug; titulo: string; comp: React.ReactNode }[]

  return (
    <div className="space-y-3">
      {data.cache_hit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start justify-between gap-3">
          <span>Resultado em cache — {data.cache_data ? formatDate(data.cache_data) : ''} — sem nova cobrança</span>
          <button onClick={onForcarNova} className="shrink-0 text-xs font-medium underline underline-offset-2">
            Forçar nova
          </button>
        </div>
      )}

      <div className="bg-white border border-[#e8e6e1] rounded-2xl overflow-hidden">
        {/* Score hero */}
        <div className="px-8 pt-8 pb-6 text-center space-y-4">
          {extra.nomeCliente && (
            <p className="text-sm font-medium text-gray-700">{extra.nomeCliente}</p>
          )}
          <p className="text-xs text-gray-400 font-mono tracking-widest">{formatCPF(cpf)}</p>
          <div>
            <p
              className={`font-display leading-none font-semibold tabular-nums ${scoreColor(data.score)}`}
              style={{ fontSize: '5.5rem' }}
            >
              {data.score}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Score · 0–1000</p>
          </div>
          <ScoreZoneBar score={data.score} />
          <div className="flex flex-col items-center gap-1">
            <VeredittoBadge veredito={data.veredito} />
            {data.faixa && <p className="text-xs text-gray-400">{data.faixa}</p>}
          </div>
        </div>

        {/* Recomendação */}
        <div className="border-t border-[#e8e6e1] px-6 py-5 space-y-2">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-3">Recomendação</p>
          <RecomendacaoCard rec={rec} />
        </div>

        {/* Seções das APIs extras */}
        {secoesDados.map(s => (
          <CardExtra key={s.slug} titulo={s.titulo}>
            {s.comp}
          </CardExtra>
        ))}

        {/* Fields do score (capacidadePagamento, perfil) */}
        {(data.capacidadePagamento || data.perfil) && (
          <CardExtra titulo="Análise Quod">
            {data.capacidadePagamento && (
              <div className="bg-surface rounded-xl p-3 border border-[#e8e6e1]">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Capacidade de pagamento</p>
                <p className="text-xs text-gray-700">{data.capacidadePagamento}</p>
              </div>
            )}
            {data.perfil && (
              <div className="bg-surface rounded-xl p-3 border border-[#e8e6e1] mt-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Perfil</p>
                <p className="text-xs text-gray-700">{data.perfil}</p>
              </div>
            )}
          </CardExtra>
        )}

        {/* Footer */}
        <div className="border-t border-[#e8e6e1] px-8 py-4 flex items-center justify-between">
          <span className="text-xs text-gray-300">{data.cache_hit ? 'Score em cache' : 'Consulta nova'}</span>
          <button onClick={onNova} className="text-sm text-[#aa0000] hover:text-[#880000] transition-colors underline underline-offset-2">
            Nova consulta
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────

const inputClass = `w-full border border-[#e8e6e1] rounded-xl px-4 py-3 text-sm bg-white
                    focus:outline-none focus:ring-2 focus:ring-[#aa0000] focus:border-transparent
                    transition-shadow`

const selectClass = `${inputClass} appearance-none cursor-pointer`

export function Consulta() {
  // CPF + consulta
  const [cpfDisplay, setCpfDisplay]           = useState('')
  const [documentoConferido, setDocumento]    = useState(false)
  const [showForcarModal, setShowForcarModal] = useState(false)
  const { state, consultar, reset }           = useConsulta()

  // Dados extras do formulário
  const [nomeCliente, setNomeCliente]   = useState('')
  const [tipoMoradia, setTipoMoradia]   = useState<TipoMoradia>('nao_informado')
  const [valor, setValor]               = useState('')
  const [parcelas, setParcelas]         = useState(1)
  const [finalidade, setFinalidade]     = useState('')
  const [temComprovante, setComprovante]= useState(false)
  const [temIndicacao, setIndicacao]    = useState(false)
  const [primeiraCompra, setPrimeira]   = useState(true)

  // APIs selecionadas
  const [apisAtivas, setApisAtivas] = useState<Set<ApiSlug>>(
    new Set(['nivel-socioeconomico'])
  )

  // Snapshot para o resultado
  const [extraSnapshot, setExtraSnapshot] = useState<FormExtra>({
    nomeCliente: '', tipoMoradia: 'nao_informado', valor: 0, parcelas: 1,
    finalidade: '', temComprovante: false, temIndicacao: false, primeiraCompra: true,
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

  function handleCPFChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCpfDisplay(formatCPF(e.target.value))
  }

  function handleConsultar() {
    if (!cpfValido || !documentoConferido) return
    setExtraSnapshot({
      nomeCliente,
      tipoMoradia,
      valor: parseFloat(valor.replace(',', '.')) || 0,
      parcelas,
      finalidade,
      temComprovante,
      temIndicacao,
      primeiraCompra,
    })
    consultar(cpfDigits, documentoConferido, Array.from(apisAtivas), nomeCliente)
  }

  function handleForcarNova(motivo: string) {
    setShowForcarModal(false)
    consultar(cpfDigits, documentoConferido, Array.from(apisAtivas), nomeCliente, motivo)
  }

  function handleNova() {
    setCpfDisplay('')
    setDocumento(false)
    setNomeCliente('')
    setTipoMoradia('nao_informado')
    setValor('')
    setParcelas(1)
    setFinalidade('')
    setComprovante(false)
    setIndicacao(false)
    setPrimeira(true)
    reset()
  }

  const isIdle    = state.status === 'idle'
  const isLoading = state.status === 'loading'
  const showForm  = isIdle || isLoading

  return (
    <div className="min-h-screen bg-surface">
      <Header />

      <main className="max-w-lg mx-auto px-4 py-10 space-y-4">
        {showForm && (
          <div className="bg-white border border-[#e8e6e1] rounded-2xl p-7 space-y-5">

            {/* DADOS DO CLIENTE */}
            <FormSection title="Dados do cliente" />

            <div className="space-y-1.5">
              <label className="block text-sm text-gray-600">Nome completo</label>
              <input
                type="text"
                placeholder="Nome do cliente"
                value={nomeCliente}
                onChange={e => setNomeCliente(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm text-gray-600">CPF</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpfDisplay}
                onChange={handleCPFChange}
                maxLength={14}
                className={`${inputClass} font-mono tracking-wider`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm text-gray-600">Tipo de moradia</label>
              <div className="relative">
                <select
                  value={tipoMoradia}
                  onChange={e => setTipoMoradia(e.target.value as TipoMoradia)}
                  className={selectClass}
                >
                  <option value="nao_informado">Não informado</option>
                  <option value="propria">Própria</option>
                  <option value="familiar">Com familiar</option>
                  <option value="alugada">Alugada</option>
                </select>
                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* DADOS DA COMPRA */}
            <FormSection title="Dados da compra" />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm text-gray-600">Valor (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm text-gray-600">Parcelas</label>
                <div className="relative">
                  <select
                    value={parcelas}
                    onChange={e => setParcelas(Number(e.target.value))}
                    className={selectClass}
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                      <option key={n} value={n}>{n}x</option>
                    ))}
                  </select>
                  <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm text-gray-600">Finalidade</label>
              <input
                type="text"
                placeholder="Ex: guarda-roupa, cama, calçado..."
                value={finalidade}
                onChange={e => setFinalidade(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* FATORES DE ANÁLISE */}
            <FormSection title="Fatores de análise" />

            <div className="space-y-3">
              <Checkbox checked={documentoConferido} onChange={setDocumento}    label="Documento do cliente conferido" />
              <Checkbox checked={temComprovante}     onChange={setComprovante}  label="Tem comprovante de renda" />
              <Checkbox checked={temIndicacao}       onChange={setIndicacao}    label="Tem indicação de cliente" />
              <Checkbox checked={primeiraCompra}     onChange={setPrimeira}     label="Primeira compra na loja" />
            </div>

            {/* ANÁLISES ADICIONAIS */}
            <FormSection title="Análises adicionais" />

            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                Incluído: <strong className="text-gray-700">Score de Crédito (Quod)</strong>
                <span className="ml-1 text-gray-400">— R$ {SCORE_CUSTO.toFixed(2)}</span>
              </p>

              {API_OPCOES.map(api => {
                const ativo = apisAtivas.has(api.slug)
                return (
                  <label
                    key={api.slug}
                    className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl border border-[#e8e6e1] hover:border-gray-400 transition-colors"
                  >
                    <div className="relative flex-shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={ativo}
                        onChange={() => toggleApi(api.slug)}
                        className="sr-only peer"
                      />
                      <div className="w-4 h-4 border-2 border-gray-300 rounded peer-checked:bg-[#aa0000] peer-checked:border-[#aa0000] transition-all" />
                      {ativo && (
                        <svg className="absolute inset-0 w-4 h-4 text-white p-0.5" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-gray-800">{api.nome}</span>
                        <span className="text-xs text-gray-400 shrink-0">R$ {api.preco.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{api.descricao}</p>
                    </div>
                  </label>
                )
              })}

              <div className="flex justify-between items-center pt-2 border-t border-[#e8e6e1]">
                <span className="text-xs text-gray-500">Total da consulta</span>
                <span className="text-sm font-semibold text-gray-900">R$ {custoTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleConsultar}
              disabled={!cpfValido || !documentoConferido || isLoading}
              className="w-full bg-[#aa0000] text-white py-3.5 rounded-xl text-sm font-medium
                         hover:bg-[#880000] disabled:opacity-40 transition-colors
                         flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? <><Spinner size="sm" /> Consultando...</> : 'Consultar'}
            </button>
          </div>
        )}

        {state.status === 'resultado' && (() => {
          const { data } = state

          if (data.tipo === 'cpf_nao_encontrado') {
            return (
              <div className="bg-white border border-[#e8e6e1] rounded-2xl p-10 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803M10.5 7.5v6m3-3h-6" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">CPF não localizado</h3>
                  <p className="text-sm text-gray-400 mt-1">Seguir para análise manual.</p>
                </div>
                <button onClick={handleNova} className="text-sm text-[#aa0000] underline underline-offset-2">
                  Nova consulta
                </button>
              </div>
            )
          }

          if (data.tipo === 'erro_sistema') {
            return (
              <div className="bg-white border border-[#e8e6e1] rounded-2xl p-10 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
                  <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Consulta indisponível</h3>
                  <p className="text-sm text-gray-400 mt-1">Tente novamente. Se o problema persistir, verifique o saldo da conta.</p>
                </div>
                <details className="text-left text-xs text-gray-400">
                  <summary className="cursor-pointer hover:text-gray-600">Detalhes técnicos</summary>
                  <p className="mt-2 font-mono bg-surface p-3 rounded-lg text-gray-500 border border-[#e8e6e1]">{data.motivo}</p>
                </details>
                <button onClick={handleNova} className="text-sm text-[#aa0000] underline underline-offset-2">
                  Tentar novamente
                </button>
              </div>
            )
          }

          return (
            <ResultadoOkView
              data={data}
              cpf={cpfDigits}
              extra={extraSnapshot}
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
```

- [ ] **Step 2: Verificar que o frontend compila sem erros**

```bash
cd frontend && npm run build
```

Esperado: build sem erros TypeScript.

- [ ] **Step 3: Testar manualmente**

1. `npm run dev` na pasta `frontend/`
2. Logar com um usuário cadastrado
3. No formulário, selecionar 1-2 APIs extras
4. Verificar que o custo total atualiza em tempo real
5. Consultar um CPF e verificar que as seções de resultado aparecem
6. Verificar que a recomendação muda ao marcar/desmarcar campos

- [ ] **Step 4: Commit final**

```bash
git add frontend/src/pages/Consulta.tsx
git commit -m "feat: multi-API selector with cost display and rich result sections"
```

---

## Task 6: Redeploy da Edge Function

**Files:**
- (já modificado em Task 4)

- [ ] **Step 1: Deploy**

```bash
supabase functions deploy consultar-cpf
```

- [ ] **Step 2: Testar end-to-end**

No browser, fazer uma consulta com APIs extras selecionadas e confirmar que os dados aparecem nas seções de resultado.

- [ ] **Step 3: Commit de tag de release**

```bash
git tag v1.1.0-multi-api
git push && git push --tags
```
