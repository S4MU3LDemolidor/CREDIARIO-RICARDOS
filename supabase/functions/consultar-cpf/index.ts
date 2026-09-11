import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Regra de decisao pelo numero — exportada para testes */
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ tipo: 'erro_sistema', motivo: 'Nao autorizado' }, 401)

  const supabaseUrl      = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const fontedataApiKey  = Deno.env.get('FONTEDATA_API_KEY')!
  const cacheDias        = parseInt(Deno.env.get('CACHE_DIAS') ?? '30', 10)

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Validar JWT e obter usuario
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user) return jsonResponse({ tipo: 'erro_sistema', motivo: 'Sessao invalida' }, 401)

  // Buscar perfil para obter loja_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('loja_id')
    .eq('id', user.id)
    .single()
  if (profileError || !profile) {
    return jsonResponse({ tipo: 'erro_sistema', motivo: 'Perfil do operador nao encontrado' }, 403)
  }

  // Parsear payload
  let body: { cpf: string; documento_conferido: boolean; motivo_forca?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ tipo: 'erro_sistema', motivo: 'Payload invalido' }, 400)
  }

  const { cpf, documento_conferido, motivo_forca } = body
  const cpfDigits = cpf.replace(/\D/g, '')

  if (cpfDigits.length !== 11) {
    return jsonResponse({ tipo: 'erro_sistema', motivo: 'CPF deve ter 11 digitos' }, 400)
  }

  // Verificar cache (apenas se nao for consulta forcada)
  if (!motivo_forca) {
    const cacheLimit = new Date()
    cacheLimit.setDate(cacheLimit.getDate() - cacheDias)

    const { data: cached } = await supabase
      .from('consultas')
      .select('score, veredito, faixa, criado_em')
      .eq('cpf', cpfDigits)
      .eq('tipo_resultado', 'ok')
      .gte('criado_em', cacheLimit.toISOString())
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cached && typeof cached.score === 'number') {
      return jsonResponse({
        tipo: 'ok',
        veredito: cached.veredito,
        score: cached.score,
        faixa: cached.faixa,
        cache_hit: true,
        cache_data: cached.criado_em,
      })
    }
  }

  // Consulta paga a FonteData
  type ResultadoInterno =
    | { tipo: 'ok'; veredito: 'APROVADO' | 'MANUAL' | 'NEGADO'; score: number; faixa: string | null }
    | { tipo: 'cpf_nao_encontrado' }
    | { tipo: 'erro_sistema'; motivo: string }

  let resultado: ResultadoInterno

  try {
    const apiRes = await fetch(
      `https://app.fontedata.com/api/v1/consulta/score-credito-quod?cpf=${cpfDigits}`,
      { headers: { 'X-API-Key': fontedataApiKey } }
    )

    if (apiRes.status === 404) {
      resultado = { tipo: 'cpf_nao_encontrado' }
    } else if (apiRes.status === 403) {
      resultado = { tipo: 'erro_sistema', motivo: 'Saldo insuficiente na conta FonteData' }
    } else if (apiRes.status === 200) {
      const apiData = await apiRes.json()
      const score = apiData?.pessoaFisica?.score
      if (typeof score !== 'number') {
        resultado = { tipo: 'erro_sistema', motivo: 'Resposta da API sem score numerico' }
      } else {
        resultado = {
          tipo: 'ok',
          veredito: aplicarRegra(score),
          score,
          faixa: apiData?.pessoaFisica?.faixaScore ?? null,
        }
      }
    } else {
      resultado = { tipo: 'erro_sistema', motivo: `Erro inesperado da API (HTTP ${apiRes.status})` }
    }
  } catch {
    resultado = { tipo: 'erro_sistema', motivo: 'Falha de rede ao consultar API externa' }
  }

  // Gravar no log
  await supabase.from('consultas').insert({
    cpf:                 cpfDigits,
    tipo_resultado:      resultado.tipo,
    score:               resultado.tipo === 'ok' ? resultado.score : null,
    veredito:            resultado.tipo === 'ok' ? resultado.veredito : null,
    faixa:               resultado.tipo === 'ok' ? resultado.faixa : null,
    motivo_erro:         resultado.tipo === 'erro_sistema' ? resultado.motivo : null,
    loja_id:             profile.loja_id,
    operador_id:         user.id,
    documento_conferido: documento_conferido,
    forcou_nova:         !!motivo_forca,
    motivo_forca:        motivo_forca ?? null,
  })

  const responseBody =
    resultado.tipo === 'ok'
      ? { ...resultado, cache_hit: false }
      : resultado

  return jsonResponse(responseBody)
})
