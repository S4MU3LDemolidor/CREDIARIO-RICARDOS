import { createClient } from 'npm:@supabase/supabase-js@2'

function getCors(): Record<string, string> {
  const origin = Deno.env.get('ALLOWED_ORIGIN') ?? '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

const SLUGS_PERMITIDOS = new Set([
  'nivel-socioeconomico',
  'processos-agrupada',
  'antecedentes-federais',
  'registration-brazil',
  'cadastro-pf-plus',
  'assistencia-social-pf',
])

/** Regra de decisao pelo numero — exportada para testes */
export function aplicarRegra(score: number): 'APROVADO' | 'MANUAL' | 'NEGADO' {
  if (score <= 600) return 'NEGADO'
  if (score <= 700) return 'MANUAL'
  return 'APROVADO'
}

/** Valida CPF pelos digitos verificadores — exportada para testes */
export function validarCPF(cpf: string): boolean {
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i)
  const rem1 = sum % 11
  const d1 = rem1 < 2 ? 0 : 11 - rem1
  if (parseInt(cpf[9]) !== d1) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i)
  const rem2 = sum % 11
  const d2 = rem2 < 2 ? 0 : 11 - rem2
  return parseInt(cpf[10]) === d2
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCors(), 'Content-Type': 'application/json' },
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
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCors() })

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
  if (!validarCPF(cpfDigits)) {
    return jsonResponse({ tipo: 'erro_sistema', motivo: 'CPF invalido' }, 400)
  }

  // Filtrar apenas slugs permitidos
  const slugsExtras = apis_extras.filter(s => SLUGS_PERMITIDOS.has(s))

  // ── Verificar cache do score ──────────────────────────────────────────────
  let scoreFromCache = false
  let scoreData: {
    id: string
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
      .select('id, score, veredito, faixa, capacidade_pagamento, perfil_credito, criado_em')
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
  const score    = scoreFromCache ? scoreData!.score                : scoreApiResult!.score
  const veredito = scoreFromCache ? scoreData!.veredito             : scoreApiResult!.veredito
  const faixa    = scoreFromCache ? scoreData!.faixa                : scoreApiResult!.faixa
  const capPag   = scoreFromCache ? scoreData!.capacidade_pagamento : scoreApiResult!.capacidadePagamento
  const perfil   = scoreFromCache ? scoreData!.perfil_credito       : scoreApiResult!.perfil

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

  // ── Atualizar dados_extras na linha de cache quando novos extras foram buscados ──
  if (scoreFromCache && scoreData && Object.keys(dadosExtras).length > 0) {
    supabase
      .from('consultas')
      .update({ dados_extras: dadosExtras })
      .eq('id', scoreData.id)
      .then(({ error }) => { if (error) console.error('Failed to save dados_extras:', error) })
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
