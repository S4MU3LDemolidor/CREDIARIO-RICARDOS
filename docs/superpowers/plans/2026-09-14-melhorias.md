# Melhorias CREDIARIO — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar 10 melhorias identificadas em análise de código: bug de dados_extras no cache, performance do histórico, segurança CORS, validação de CPF com dígitos verificadores, índice SQL, extração de recomendação, estilos compartilhados, Error Boundary, e responsividade.

**Architecture:** Mudanças incrementais e independentes — cada task produz código funcionando e commitado. Não há dependências entre tasks, exceto Task 7 (estilos compartilhados) que deve vir antes de Task 10 (responsividade usa os mesmos inputs). Tasks 1–9 podem ser executadas em qualquer ordem; Task 10 vem por último.

**Tech Stack:** React 18 + TypeScript + Vite + Vitest + Tailwind CSS (frontend) | Deno + Supabase Edge Functions (backend) | PostgreSQL + RLS (banco)

---

## Mapa de arquivos

| Arquivo | Tarefa |
|---|---|
| `.env.example` (criar) | Task 1 |
| `frontend/src/lib/formatters.ts` | Task 2 |
| `frontend/src/lib/formatters.test.ts` | Task 2 |
| `supabase/functions/consultar-cpf/index.ts` | Task 3, Task 4, Task 5 |
| `supabase/functions/consultar-cpf/index.test.ts` | Task 3 |
| `supabase/migrations/20260914000001_composite_cache_index.sql` (criar) | Task 3 |
| `frontend/src/lib/recomendacao.ts` (criar) | Task 6 |
| `frontend/src/lib/recomendacao.test.ts` (criar) | Task 6 |
| `frontend/src/pages/Consulta.tsx` | Task 6, Task 8 |
| `frontend/src/lib/styles.ts` (criar) | Task 7 |
| `frontend/src/pages/Historico.tsx` | Task 7, Task 9, Task 10 |
| `frontend/src/components/ErrorBoundary.tsx` (criar) | Task 8 |
| `frontend/src/main.tsx` | Task 8 |
| `frontend/src/hooks/useHistorico.ts` | Task 9 |

---

## Task 1: Arquivo `.env.example`

**Files:**
- Create: `.env.example`
- Create: `frontend/.env.example`

- [ ] **Criar `.env.example` na raiz (variáveis da Edge Function)**

```bash
# .env.example
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# FonteData API
FONTEDATA_API_KEY=your-fontedata-api-key

# Cache: número de dias antes de uma nova consulta ser obrigatória
CACHE_DIAS=30

# CORS: domínio autorizado a chamar a Edge Function (sem trailing slash)
ALLOWED_ORIGIN=https://your-app.vercel.app
```

- [ ] **Criar `frontend/.env.example`**

```bash
# frontend/.env.example
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Commit**

```bash
git add .env.example frontend/.env.example
git commit -m "docs: adicionar .env.example com todas as variaveis necessarias"
```

---

## Task 2: Validação de CPF com dígitos verificadores

**Files:**
- Modify: `frontend/src/lib/formatters.ts`
- Modify: `frontend/src/lib/formatters.test.ts`

**Contexto:** A função `isValidCPF` atualmente só verifica comprimento (11 dígitos). CPFs como `000.000.000-00` ou `111.111.111-11` são aceitos. O algoritmo correto valida os dois dígitos verificadores e rejeita sequências repetidas.

- [ ] **Adicionar testes para o algoritmo de dígitos verificadores em `frontend/src/lib/formatters.test.ts`**

Adicionar este bloco após os testes existentes de `isValidCPF`:

```typescript
describe('isValidCPF — digitos verificadores', () => {
  it('retorna true para CPF valido 529.982.247-25', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true)
  })
  it('retorna true para CPF valido sem mascara 52998224725', () => {
    expect(isValidCPF('52998224725')).toBe(true)
  })
  it('retorna false para CPF com digito verificador errado', () => {
    expect(isValidCPF('529.982.247-26')).toBe(false)
  })
  it('retorna false para sequencia repetida 111.111.111-11', () => {
    expect(isValidCPF('111.111.111-11')).toBe(false)
  })
  it('retorna false para sequencia repetida 000.000.000-00', () => {
    expect(isValidCPF('000.000.000-00')).toBe(false)
  })
  it('retorna false para 999.999.999-99', () => {
    expect(isValidCPF('999.999.999-99')).toBe(false)
  })
})
```

- [ ] **Rodar os testes e confirmar que falham**

```bash
cd frontend && npx vitest run src/lib/formatters.test.ts
```

Esperado: os 6 novos testes falham (o primeiro retorna `true` mas o teste de dígito errado retorna `true` também).

- [ ] **Implementar o algoritmo completo em `frontend/src/lib/formatters.ts`**

Substituir a função `isValidCPF` existente (linhas 13–15):

```typescript
export function isValidCPF(cpf: string): boolean {
  const d = stripCPF(cpf)
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false   // rejeita 000...0, 111...1, etc.

  // Primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i)
  const rem1 = sum % 11
  const d1 = rem1 < 2 ? 0 : 11 - rem1
  if (parseInt(d[9]) !== d1) return false

  // Segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i)
  const rem2 = sum % 11
  const d2 = rem2 < 2 ? 0 : 11 - rem2
  return parseInt(d[10]) === d2
}
```

- [ ] **Rodar os testes e confirmar que passam**

```bash
cd frontend && npx vitest run src/lib/formatters.test.ts
```

Esperado: todos os testes passam (incluindo os 6 novos).

- [ ] **Commit**

```bash
git add frontend/src/lib/formatters.ts frontend/src/lib/formatters.test.ts
git commit -m "feat: validacao de CPF com digitos verificadores e rejeicao de sequencias repetidas"
```

---

## Task 3: Índice composto para cache + validação CPF na Edge Function

**Files:**
- Create: `supabase/migrations/20260914000001_composite_cache_index.sql`
- Modify: `supabase/functions/consultar-cpf/index.ts`
- Modify: `supabase/functions/consultar-cpf/index.test.ts`

**Contexto:** A query de cache usa `WHERE cpf = ? AND tipo_resultado = 'ok' ORDER BY criado_em DESC` mas o índice atual só cobre `cpf`. Um índice composto elimina o sort + filter separados. Além disso, a Edge Function também valida CPF apenas por comprimento.

- [ ] **Criar migration `supabase/migrations/20260914000001_composite_cache_index.sql`**

```sql
-- Indice composto para query de cache: cpf + tipo_resultado + criado_em DESC
-- Elimina sort separado e filtro de tipo_resultado na busca de cache
CREATE INDEX IF NOT EXISTS idx_consultas_cache
  ON consultas(cpf, tipo_resultado, criado_em DESC);
```

- [ ] **Adicionar testes para `validarCPF` em `supabase/functions/consultar-cpf/index.test.ts`**

Substituir o conteúdo do arquivo completo:

```typescript
import { assertEquals } from 'jsr:@std/assert'
import { aplicarRegra, validarCPF } from './index.ts'

Deno.test('score 0 -> NEGADO',     () => assertEquals(aplicarRegra(0),    'NEGADO'))
Deno.test('score 600 -> NEGADO',   () => assertEquals(aplicarRegra(600),  'NEGADO'))
Deno.test('score 601 -> MANUAL',   () => assertEquals(aplicarRegra(601),  'MANUAL'))
Deno.test('score 700 -> MANUAL',   () => assertEquals(aplicarRegra(700),  'MANUAL'))
Deno.test('score 701 -> APROVADO', () => assertEquals(aplicarRegra(701),  'APROVADO'))
Deno.test('score 1000 -> APROVADO',() => assertEquals(aplicarRegra(1000), 'APROVADO'))

Deno.test('validarCPF: CPF valido 52998224725',           () => assertEquals(validarCPF('52998224725'), true))
Deno.test('validarCPF: CPF invalido digito errado',       () => assertEquals(validarCPF('52998224726'), false))
Deno.test('validarCPF: sequencia repetida 11111111111',   () => assertEquals(validarCPF('11111111111'), false))
Deno.test('validarCPF: sequencia repetida 00000000000',   () => assertEquals(validarCPF('00000000000'), false))
Deno.test('validarCPF: comprimento errado 1234567890',    () => assertEquals(validarCPF('1234567890'),  false))
```

- [ ] **Adicionar `validarCPF` e atualizar validação em `supabase/functions/consultar-cpf/index.ts`**

**Adicionar** esta função exportada logo após `aplicarRegra` (após a linha `export function aplicarRegra...`):

```typescript
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
```

**Substituir** a validação de CPF existente (linhas 99–101) que diz `if (cpfDigits.length !== 11)`:

```typescript
  if (!validarCPF(cpfDigits)) {
    return jsonResponse({ tipo: 'erro_sistema', motivo: 'CPF invalido' }, 400)
  }
```

- [ ] **Commit**

```bash
git add supabase/migrations/20260914000001_composite_cache_index.sql \
        supabase/functions/consultar-cpf/index.ts \
        supabase/functions/consultar-cpf/index.test.ts
git commit -m "feat: indice composto cache + validacao CPF com digitos verificadores na Edge Function"
```

---

## Task 4: Corrigir bug — dados_extras perdidos no cache hit

**Files:**
- Modify: `supabase/functions/consultar-cpf/index.ts`

**Contexto:** Quando há cache hit e o usuário solicitou `apis_extras`, as APIs são chamadas e os dados retornados para o frontend, mas **não são salvos no banco**. A consulta original no histórico sempre mostrará `dados_extras = null`. A correção é: se houve cache hit e há `dadosExtras` novos, fazer `UPDATE` na linha de cache para gravar os extras.

- [ ] **Alterar o SELECT de cache para incluir `id` e modificar a lógica de gravação**

Na seção `// ── Verificar cache do score`, alterar o `.select(...)` para incluir `id`:

```typescript
    const { data: cached } = await supabase
      .from('consultas')
      .select('id, score, veredito, faixa, capacidade_pagamento, perfil_credito, criado_em')
      .eq('cpf', cpfDigits)
      .eq('tipo_resultado', 'ok')
      .gte('criado_em', cacheLimit.toISOString())
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()
```

O tipo `scoreData` também precisa incluir `id`. Localizar a declaração do tipo de `scoreData` (linhas ~108–115) e adicionar `id`:

```typescript
  let scoreData: {
    id: string
    score: number
    veredito: string
    faixa: string | null
    capacidade_pagamento: string | null
    perfil_credito: string | null
    criado_em: string
  } | null = null
```

- [ ] **Adicionar UPDATE de dados_extras após chamar APIs extras no cache hit**

Localizar o bloco `// ── Gravar no log` (linhas ~215–234) que já tem a condicional `if (!scoreFromCache)`. Após esse bloco, adicionar:

```typescript
  // ── Atualizar dados_extras na linha de cache quando novos extras foram buscados ──
  if (scoreFromCache && scoreData && Object.keys(dadosExtras).length > 0) {
    await supabase
      .from('consultas')
      .update({ dados_extras: dadosExtras })
      .eq('id', scoreData.id)
  }
```

- [ ] **Commit**

```bash
git add supabase/functions/consultar-cpf/index.ts
git commit -m "fix: gravar dados_extras no banco mesmo quando resultado vem do cache"
```

---

## Task 5: CORS restritivo via variável de ambiente

**Files:**
- Modify: `supabase/functions/consultar-cpf/index.ts`

**Contexto:** O CORS atual usa `*`, permitindo chamadas de qualquer origem. Para um sistema interno, deve ser restrito ao domínio de produção. O valor vem de `Deno.env.get('ALLOWED_ORIGIN')` para que diferentes ambientes (staging, prod) possam ter domínios diferentes.

- [ ] **Substituir o objeto CORS estático por uma função que lê a env var**

Localizar as linhas 3–6 onde `const CORS` é definido e substituir por:

```typescript
function getCors(): Record<string, string> {
  const origin = Deno.env.get('ALLOWED_ORIGIN') ?? '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}
```

- [ ] **Atualizar todos os usos de `CORS` para `getCors()`**

Há 3 lugares:
1. Linha `if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })` → `{ headers: getCors() }`
2. Dentro de `jsonResponse`:
```typescript
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCors(), 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Commit**

```bash
git add supabase/functions/consultar-cpf/index.ts
git commit -m "feat: CORS restritivo via ALLOWED_ORIGIN env var"
```

---

## Task 6: Extrair `calcularRecomendacao` para `lib/recomendacao.ts`

**Files:**
- Create: `frontend/src/lib/recomendacao.ts`
- Create: `frontend/src/lib/recomendacao.test.ts`
- Modify: `frontend/src/pages/Consulta.tsx`

**Contexto:** A função `calcularRecomendacao` (100 linhas) está embutida em `Consulta.tsx` junto com toda a UI. Extraindo para `lib/recomendacao.ts` fica testável e `Consulta.tsx` fica responsável apenas pela UI.

- [ ] **Criar `frontend/src/lib/recomendacao.test.ts` com testes básicos**

```typescript
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
    const extra = { ...extraBase, temComprovante: false }
    const rec = calcularRecomendacao(650, 'MANUAL', extra, {})
    expect(rec.condicoes.some(c => c.includes('comprovante'))).toBe(true)
  })

  it('antecedentes criminais penaliza fortemente', () => {
    const semAntecedentes = calcularRecomendacao(800, 'APROVADO', extraBase, {})
    const comAntecedentes = calcularRecomendacao(800, 'APROVADO', extraBase, {
      'antecedentes-federais': { possuiAntecedentesCriminais: true, status: null, nome: null, dataNascimento: null, numeroCertidao: null, dataEmissao: null, dataValidade: null }
    })
    expect(comAntecedentes.nivel).not.toBe(semAntecedentes.nivel === 'RECOMENDADO' ? 'RECOMENDADO' : 'never')
    expect(comAntecedentes.fatoresNegativos.some(f => f.includes('criminal'))).toBe(true)
  })
})
```

- [ ] **Rodar os testes e confirmar que falham**

```bash
cd frontend && npx vitest run src/lib/recomendacao.test.ts
```

Esperado: erro de módulo não encontrado.

- [ ] **Criar `frontend/src/lib/recomendacao.ts`**

Copiar os tipos locais e a função de `Consulta.tsx`. O arquivo completo:

```typescript
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
```

- [ ] **Rodar os testes e confirmar que passam**

```bash
cd frontend && npx vitest run src/lib/recomendacao.test.ts
```

Esperado: 4 testes passam.

- [ ] **Atualizar `frontend/src/pages/Consulta.tsx` para importar do novo módulo**

Remover as linhas 31–51 (`type TipoMoradia`, `type RecomendacaoNivel`, `interface FormExtra`, `interface Recomendacao`) e as linhas 55–155 (toda a função `calcularRecomendacao`).

Substituir o bloco de imports nas primeiras linhas:

```typescript
import { useState, useRef, useEffect } from 'react'
import { Spinner } from '../components/Spinner'
import { VeredittoBadge, scoreColor } from '../components/Badge'
import { ForcarNovaModal } from '../components/ForcarNovaModal'
import { DadosExtrasView } from '../components/DadosExtrasView'
import { useConsulta } from '../hooks/useConsulta'
import { formatCPF, stripCPF, isValidCPF, formatDate } from '../lib/formatters'
import {
  calcularRecomendacao, FormExtra, Recomendacao, TipoMoradia, RecomendacaoNivel,
} from '../lib/recomendacao'
import { ResultadoOk, Veredito, DadosExtras } from '../types'
```

- [ ] **Confirmar que o build do frontend não tem erros**

```bash
cd frontend && npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Commit**

```bash
git add frontend/src/lib/recomendacao.ts frontend/src/lib/recomendacao.test.ts frontend/src/pages/Consulta.tsx
git commit -m "refactor: extrair calcularRecomendacao para lib/recomendacao com testes"
```

---

## Task 7: Constante `inp` / `sel` compartilhada em `lib/styles.ts`

**Files:**
- Create: `frontend/src/lib/styles.ts`
- Modify: `frontend/src/pages/Consulta.tsx`
- Modify: `frontend/src/pages/Historico.tsx`

**Contexto:** A mesma string de classes Tailwind para inputs está duplicada em `Consulta.tsx:366` e `Historico.tsx:37`. Centralizar em `lib/styles.ts`.

- [ ] **Criar `frontend/src/lib/styles.ts`**

```typescript
export const inp =
  'w-full bg-white border border-[#e5e7eb] rounded-lg px-3.5 py-2.5 text-sm text-[#111827] ' +
  'placeholder:text-[#9ca3af] focus:outline-none focus:border-[#9ca3af] transition-colors'

export const sel = `${inp} appearance-none cursor-pointer`
```

- [ ] **Atualizar `frontend/src/pages/Consulta.tsx`**

Remover as linhas que definem `const inp` e `const sel` (próximas à linha 366):

```typescript
// REMOVER estas linhas:
const inp = `w-full bg-white border border-[#e5e7eb] rounded-lg px-3.5 py-2.5 text-sm text-[#111827]
             placeholder:text-[#9ca3af] focus:outline-none focus:border-[#9ca3af] transition-colors`

const sel = `${inp} appearance-none cursor-pointer`
```

Adicionar o import no topo do arquivo (junto com os outros imports):

```typescript
import { inp, sel } from '../lib/styles'
```

- [ ] **Atualizar `frontend/src/pages/Historico.tsx`**

Remover as linhas que definem `const inp` (próximas à linha 37):

```typescript
// REMOVER:
const inp = `bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm text-[#374151]
             placeholder:text-[#9ca3af] focus:outline-none focus:border-[#9ca3af] transition-colors`
```

Adicionar o import no topo do arquivo:

```typescript
import { inp } from '../lib/styles'
```

**Nota:** `Historico.tsx` usava `px-3 py-2` enquanto `Consulta.tsx` usava `px-3.5 py-2.5`. O `lib/styles.ts` usa `px-3.5 py-2.5` (padrão do Consulta, que é o design principal). O Historico ficará consistente com isso.

- [ ] **Confirmar que o build não tem erros**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add frontend/src/lib/styles.ts frontend/src/pages/Consulta.tsx frontend/src/pages/Historico.tsx
git commit -m "refactor: centralizar classes de input em lib/styles.ts"
```

---

## Task 8: Error Boundary

**Files:**
- Create: `frontend/src/components/ErrorBoundary.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Criar `frontend/src/components/ErrorBoundary.tsx`**

```typescript
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-10 max-w-md w-full text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#fee2e2] flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-[#aa0000]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-[#111827]">Algo deu errado</h2>
              <p className="text-sm text-[#6b7280] mt-1">Recarregue a página. Se o problema persistir, contate o suporte.</p>
            </div>
            <details className="text-left text-xs text-[#9ca3af]">
              <summary className="cursor-pointer hover:text-[#6b7280] transition-colors">Detalhes técnicos</summary>
              <p className="mt-2 font-mono bg-[#f9fafb] p-3 rounded-lg border border-[#e5e7eb] text-[#6b7280] break-all">
                {this.state.error.message}
              </p>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#111827] text-white rounded-lg text-sm font-semibold hover:bg-[#374151] transition-colors"
            >
              Recarregar
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

- [ ] **Atualizar `frontend/src/main.tsx` para envolver com ErrorBoundary**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { AuthProvider } from './contexts/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
)
```

- [ ] **Commit**

```bash
git add frontend/src/components/ErrorBoundary.tsx frontend/src/main.tsx
git commit -m "feat: ErrorBoundary para capturar erros de render e exibir tela amigavel"
```

---

## Task 9: Performance — lazy load de `dados_extras` no histórico

**Files:**
- Modify: `frontend/src/hooks/useHistorico.ts`
- Modify: `frontend/src/pages/Historico.tsx`

**Contexto:** O hook carrega `SELECT *` incluindo o campo `dados_extras` (JSONB potencialmente grande) para cada linha da tabela. Como `dados_extras` só é exibido no painel de detalhe (quando uma linha é selecionada), deve ser carregado sob demanda. A query principal fica mais leve. A `ConsultaRow` não muda — `dados_extras` continua no tipo mas começa como `null` e é populado quando necessário.

- [ ] **Atualizar `frontend/src/hooks/useHistorico.ts`**

Substituir o conteúdo do arquivo:

```typescript
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
        else setRows((data ?? []).map(r => ({ ...r, dados_extras: null })) as ConsultaRow[])
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  async function loadDadosExtras(id: string): Promise<DadosExtras | null> {
    const { data } = await supabase
      .from('consultas')
      .select('dados_extras')
      .eq('id', id)
      .single()
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
```

- [ ] **Atualizar `frontend/src/pages/Historico.tsx` para usar `loadDadosExtras`**

Substituir as primeiras linhas do componente `Historico`:

```typescript
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

  async function handleRowClick(row: ConsultaRow) {
    if (selectedRow?.id === row.id) {
      setSelectedRow(null)
      setSelectedExtras(null)
      return
    }
    setSelectedRow(row)
    setSelectedExtras(null)
    setExtrasLoading(true)
    const extras = await loadDadosExtras(row.id)
    setSelectedExtras(extras)
    setExtrasLoading(false)
  }
```

Adicionar `DadosExtras` ao import de tipos no topo do arquivo:

```typescript
import { ConsultaRow, DadosExtras } from '../types'
```

No painel de detalhe, localizar onde `selectedRow.dados_extras` é usado (duas ocorrências) e substituir:

**Primeira ocorrência** (verificação de existência):
```typescript
  {/* Dados extras */}
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
```

- [ ] **Verificar que `Spinner` aceita prop `size`**

Abrir `frontend/src/components/Spinner.tsx`. Se não aceitar `size="sm"`, verificar a interface e adicionar `size?: 'sm' | 'md'` se necessário. (Ver conteúdo antes de editar.)

- [ ] **Confirmar build sem erros**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add frontend/src/hooks/useHistorico.ts frontend/src/pages/Historico.tsx
git commit -m "perf: lazy load de dados_extras no historico — query inicial mais leve"
```

---

## Task 10: Responsividade — layout não quebra em telas pequenas

**Files:**
- Modify: `frontend/src/pages/Consulta.tsx`
- Modify: `frontend/src/pages/Historico.tsx`

**Contexto:** Todos os `grid-cols-[240px_1fr]` são fixos e quebram em telas menores que ~600px. A correção adiciona `grid-cols-1` como base com o grid de 2 colunas a partir de `sm:` (640px).

- [ ] **Atualizar `frontend/src/pages/Consulta.tsx` — `SettingRow`**

Localizar o componente `SettingRow` e o `ResultadoOkView`. Há múltiplos `grid-cols-[240px_1fr]` fixos. Substituir todos por:

```typescript
// SettingRow (linha ~372):
function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-4 sm:gap-8 py-6">
      <div>
        <p className="text-sm font-medium text-[#111827]">{label}</p>
        <p className="text-sm text-[#6b7280] mt-1 leading-relaxed">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  )
}
```

Em `ResultadoOkView`, substituir todos os `grid-cols-[240px_1fr] gap-8` por `grid-cols-1 sm:grid-cols-[240px_1fr] gap-4 sm:gap-8`. Há 4 ocorrências (Identificação, Score, Recomendação, Análise Quod). Exemplo:

```typescript
{/* Identificação */}
<div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-4 sm:gap-8 py-6">
```

- [ ] **Atualizar `frontend/src/pages/Historico.tsx` — filtros e painel de detalhe**

Localizar o grid de filtros (linha ~60) e substituir:

```typescript
<div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-4 sm:gap-8 py-6 border-b border-[#e5e7eb]">
```

O painel de detalhe em tela pequena empurra a tabela. Alterar o container de `flex gap-6 items-start` para:

```typescript
<div className="pt-6 flex flex-col lg:flex-row gap-6 items-start">
```

O painel de detalhe tem `w-[340px] shrink-0` — alterar para:

```typescript
<div className="w-full lg:w-[340px] lg:shrink-0 animate-fade-in">
```

- [ ] **Confirmar build**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add frontend/src/pages/Consulta.tsx frontend/src/pages/Historico.tsx
git commit -m "feat: responsividade — layout adapta para telas pequenas (sm/lg breakpoints)"
```

---

## Self-Review

**Cobertura:**
- [x] `.env.example` — Task 1
- [x] CPF dígitos verificadores frontend + edge function — Tasks 2 e 3
- [x] Índice composto — Task 3
- [x] Bug dados_extras cache hit — Task 4
- [x] CORS restritivo — Task 5
- [x] Extrair calcularRecomendacao — Task 6
- [x] Deduplicar `inp` — Task 7
- [x] Error Boundary — Task 8
- [x] Performance histórico lazy load — Task 9
- [x] Responsividade — Task 10

**Dependências entre tasks:**
- Task 7 (lib/styles.ts) deve ocorrer antes de Task 10 apenas se Task 10 precisar de novos inputs — não há conflito pois Task 10 só altera classes de grid, não de input.
- Task 6 (extrair recomendacao) modifica Consulta.tsx. Task 10 também modifica Consulta.tsx. Se executadas em paralelo, deve-se fazer merge. Executar Task 6 antes de Task 10 evita conflito.
- Todas as outras tasks são em arquivos distintos — sem conflito.
