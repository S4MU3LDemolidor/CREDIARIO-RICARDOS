# Extras Boa Vista e Protestos Brasil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar `boa-vista-acerta-pf` (R$ 12,28) e `protestos-brasil` (R$ 6,50) como APIs extras opcionais, com exibição de resultado e influência no algoritmo de recomendação.

**Architecture:** Cada mudança é isolada — tipos primeiro, depois backend (1 linha), frontend UI (1 bloco), exibição (2 componentes) e algoritmo (2 novos blocos). Sem mudança no fluxo de cache, autenticação ou score principal.

**Tech Stack:** React 18 + TypeScript + Vite + Vitest + Tailwind CSS | Deno + Supabase Edge Functions

---

## Mapa de arquivos

| Arquivo | Mudança |
|---|---|
| `frontend/src/types/index.ts` | Task 1 — novos tipos e DadosExtras |
| `supabase/functions/consultar-cpf/index.ts` | Task 2 — adicionar slugs ao SLUGS_PERMITIDOS |
| `frontend/src/pages/Consulta.tsx` | Task 3 — 2 itens em API_OPCOES |
| `frontend/src/components/DadosExtrasView.tsx` | Task 4 — SecaoBoaVista, SecaoProtestos, SECOES |
| `frontend/src/lib/recomendacao.ts` | Task 5 — novos fatores no algoritmo |
| `frontend/src/lib/recomendacao.test.ts` | Task 5 — testes dos novos fatores |

---

## Task 1: Tipos TypeScript

**Files:**
- Modify: `frontend/src/types/index.ts`

**Contexto:** O arquivo já define tipos para cada API extra (NivelSocioeconomico, ProcessosJudiciais etc.) e o tipo `DadosExtras` que os une. Adicionar os dois novos tipos e expandir `DadosExtras`.

- [ ] **Adicionar tipos `BoaVistaAcertaPF` e `ProtestosBrasil` em `frontend/src/types/index.ts`**

Adicionar após a definição de `AssistenciaSocial` (linha 114), antes de `ApiErro`:

```typescript
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
```

- [ ] **Adicionar os dois novos campos em `DadosExtras`**

Localizar `export type DadosExtras = Partial<{` (linha 118) e adicionar as duas novas entradas:

```typescript
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
```

- [ ] **Verificar que o TypeScript compila sem erros**

```bash
cd /Users/samwelltech/CREDIARIO/frontend && npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Commit**

```bash
cd /Users/samwelltech/CREDIARIO && git add frontend/src/types/index.ts
git commit -m "feat: tipos BoaVistaAcertaPF e ProtestosBrasil em DadosExtras"
```

---

## Task 2: Backend — liberar slugs na Edge Function

**Files:**
- Modify: `supabase/functions/consultar-cpf/index.ts`

**Contexto:** A Edge Function tem um Set `SLUGS_PERMITIDOS` (linhas 11–18) que define quais APIs extras podem ser chamadas. Slugs fora desse Set são ignorados silenciosamente. Basta adicionar os dois novos.

- [ ] **Adicionar slugs ao `SLUGS_PERMITIDOS`**

Localizar `const SLUGS_PERMITIDOS = new Set([` e adicionar as duas novas entradas:

```typescript
const SLUGS_PERMITIDOS = new Set([
  'nivel-socioeconomico',
  'processos-agrupada',
  'antecedentes-federais',
  'registration-brazil',
  'cadastro-pf-plus',
  'assistencia-social-pf',
  'boa-vista-acerta-pf',
  'protestos-brasil',
])
```

- [ ] **Commit**

```bash
cd /Users/samwelltech/CREDIARIO && git add supabase/functions/consultar-cpf/index.ts
git commit -m "feat: liberar boa-vista-acerta-pf e protestos-brasil na Edge Function"
```

---

## Task 3: Frontend — adicionar APIs extras no seletor

**Files:**
- Modify: `frontend/src/pages/Consulta.tsx`

**Contexto:** O array `API_OPCOES` (linhas 18–25) lista as APIs extras disponíveis para seleção. Cada item tem `slug`, `nome`, `descricao` e `preco`. O tipo é `as const` então a ordem importa para o display.

- [ ] **Adicionar 2 itens em `API_OPCOES`**

Localizar `] as const` que fecha o array `API_OPCOES` e adicionar antes dele:

```typescript
const API_OPCOES = [
  { slug: 'nivel-socioeconomico',  nome: 'Nível Socioeconômico e Renda',    descricao: 'Classe social (A–E), renda estimada, ocupação (CBO), escolaridade e perfil domiciliar',             preco: 0.43 },
  { slug: 'cadastro-pf-plus',      nome: 'Cadastro Pessoal Completo',        descricao: 'Nome, nascimento, endereços, telefones, situação cadastral na Receita Federal',                      preco: 0.72 },
  { slug: 'registration-brazil',   nome: 'Validação Cadastral (Antifraude)', descricao: 'Confirma identidade, endereços e faixa salarial. Detecta inconsistências e fraudes',               preco: 0.43 },
  { slug: 'processos-agrupada',    nome: 'Processos Judiciais',              descricao: 'Total de processos como réu/autor, valor das ações, distribuição por área e ano',                   preco: 1.65 },
  { slug: 'antecedentes-federais', nome: 'Antecedentes Criminais — PF',     descricao: 'Certidão SINIC da Polícia Federal — condenações com trânsito em julgado',                           preco: 0.60 },
  { slug: 'assistencia-social-pf', nome: 'Benefícios Sociais',              descricao: 'Bolsa Família, BPC, Auxílio Emergencial, Garantia-Safra, Seguro-Defeso (últimos 12 meses)',          preco: 1.07 },
  { slug: 'boa-vista-acerta-pf',   nome: 'Análise Boa Vista',               descricao: 'Score, pendências financeiras, restrições, protestos e renda presumida — base Boa Vista SCPC',      preco: 12.28 },
  { slug: 'protestos-brasil',      nome: 'Protestos em Cartório',            descricao: 'Existência e detalhamento de protestos em cartórios de todo o Brasil',                              preco: 6.50 },
] as const
```

- [ ] **Verificar build**

```bash
cd /Users/samwelltech/CREDIARIO/frontend && npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Commit**

```bash
cd /Users/samwelltech/CREDIARIO && git add frontend/src/pages/Consulta.tsx
git commit -m "feat: adicionar Boa Vista e Protestos em API_OPCOES"
```

---

## Task 4: Exibição — cards nos resultados e histórico

**Files:**
- Modify: `frontend/src/components/DadosExtrasView.tsx`

**Contexto:** O arquivo define funções `SecaoXxx` para cada API e um array `SECOES` que mapeia chave → componente. O componente `DadosExtrasView` itera esse array e renderiza os cards. Basta adicionar `SecaoBoaVista`, `SecaoProtestos` e suas entradas no array.

O padrão de cada seção:
- Recebe `data: TipoDoExtra | ApiErro`
- Retorna `<ApiErroBadge>` se `'erro' in data`
- Usa componentes `<Campo label="..." value={...} />` para campos simples

- [ ] **Adicionar imports dos novos tipos no topo de `DadosExtrasView.tsx`**

Localizar a linha 1–5 com os imports e adicionar os dois novos tipos:

```typescript
import {
  DadosExtras, NivelSocioeconomico, ProcessosJudiciais,
  AntecedentesCriminais, ValidacaoCadastral, CadastroPF,
  AssistenciaSocial, ApiErro,
  BoaVistaAcertaPF, ProtestosBrasil,
} from '../types'
```

- [ ] **Adicionar `SecaoBoaVista` após `SecaoAssistencia`**

Adicionar antes do array `SECOES`:

```typescript
function SecaoBoaVista({ data }: { data: BoaVistaAcertaPF | ApiErro }) {
  if ('erro' in data) return <ApiErroBadge msg={`Erro: ${data.erro}`} />
  const d = data as BoaVistaAcertaPF
  const score = d.scores?.ocorrencias?.[0]
  const qtdPend = parseInt(d.pendenciasFinanceiras?.quantidadeOcorrencia ?? '0')
  const qtdRest = parseInt(d.restricoes?.quantidadeOcorrencias ?? '0')
  const qtdProt = parseInt(d.protestos?.quantidadeOcorrencia ?? '0')
  const qtdChq  = parseInt(d.chequeSemFundoBacen?.quantidadeOcorrencia ?? '0')

  return (
    <div className="space-y-3">
      {d.decisao?.descricao && (
        <div className="text-sm font-semibold text-[#111827]">{d.decisao.descricao}</div>
      )}
      {score && (
        <div className="space-y-0">
          <Campo label="Score Boa Vista"         value={score.score} />
          <Campo label="Risco"                   value={score.risco} />
          <Campo label="Classificação"           value={score.classificacaoABC} />
          <Campo label="Prob. inadimplência"     value={score.probabilidadeInadimplencia} />
        </div>
      )}
      <div className="space-y-0">
        <Campo label="Classe social"             value={d.classeSocial} />
        <Campo label="Renda presumida"           value={d.rendaPresumida?.descricao ?? d.rendaPresumida?.faixa} />
        <Campo label="Pendências financeiras"    value={qtdPend > 0 ? `${qtdPend} — R$ ${d.pendenciasFinanceiras?.valorTotal ?? '?'}` : 'Nenhuma'} />
        <Campo label="Restrições"                value={qtdRest > 0 ? `${qtdRest}` : 'Nenhuma'} />
        <Campo label="Protestos (Boa Vista)"     value={qtdProt > 0 ? `${qtdProt} — R$ ${d.protestos?.valorTotal ?? '?'}` : 'Nenhum'} />
        <Campo label="Cheque sem fundo (BACEN)"  value={qtdChq > 0 ? `${qtdChq}` : 'Nenhum'} />
      </div>
    </div>
  )
}
```

- [ ] **Adicionar `SecaoProtestos` após `SecaoBoaVista`**

```typescript
function SecaoProtestos({ data }: { data: ProtestosBrasil | ApiErro }) {
  if ('erro' in data) return <ApiErroBadge msg={`Erro: ${data.erro}`} />
  const d = data as ProtestosBrasil
  const consta = d.constamProtestos

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 text-sm font-semibold ${consta ? 'text-[#aa0000]' : 'text-[#16a34a]'}`}>
        <span>{consta ? '✕' : '✓'}</span>
        <span>{consta ? 'CONSTA PROTESTO' : 'SEM PROTESTOS'}</span>
      </div>
      {consta && (
        <div className="space-y-0">
          <Campo label="Total de protestos" value={d.numeroTotalProtestos} />
          <Campo label="Valor total"         value={d.valorTotalProtestos ? `R$ ${d.valorTotalProtestos}` : null} />
          {d.protestos && d.protestos.length > 0 && (
            <div className="space-y-1 mt-2">
              <p className="text-[10px] text-[#bbb] uppercase tracking-wider">Por estado</p>
              {d.protestos.map((p, i) => (
                <div key={i} className="flex justify-between text-xs py-1 border-b border-[#f7f7f7]">
                  <span className="text-[#999]">{p.estado}</span>
                  <span className="text-[#444] font-medium">{p.numeroTotalProtestosUF} — R$ {p.valorTotalProtestosEstado}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Adicionar as duas novas entradas no array `SECOES`**

Localizar o array `SECOES` (linha 184) e adicionar os dois novos itens ao final antes do `]`:

```typescript
const SECOES: Array<{
  key: keyof DadosExtras
  titulo: string
  render: (d: NonNullable<DadosExtras[keyof DadosExtras]>) => React.ReactNode
}> = [
  { key: 'nivel-socioeconomico',  titulo: 'Nível Socioeconômico e Renda',            render: d => <SecaoNivel        data={d as NivelSocioeconomico  | ApiErro} /> },
  { key: 'processos-agrupada',    titulo: 'Processos Judiciais',                      render: d => <SecaoProcessos    data={d as ProcessosJudiciais   | ApiErro} /> },
  { key: 'antecedentes-federais', titulo: 'Antecedentes Criminais — Polícia Federal', render: d => <SecaoAntecedentes data={d as AntecedentesCriminais | ApiErro} /> },
  { key: 'registration-brazil',   titulo: 'Validação Cadastral',                      render: d => <SecaoValidacao    data={d as ValidacaoCadastral   | ApiErro} /> },
  { key: 'cadastro-pf-plus',      titulo: 'Cadastro Pessoal Completo',                render: d => <SecaoCadastro     data={d as CadastroPF            | ApiErro} /> },
  { key: 'assistencia-social-pf', titulo: 'Benefícios Sociais',                       render: d => <SecaoAssistencia  data={d as AssistenciaSocial     | ApiErro} /> },
  { key: 'boa-vista-acerta-pf',   titulo: 'Análise Boa Vista',                        render: d => <SecaoBoaVista     data={d as BoaVistaAcertaPF      | ApiErro} /> },
  { key: 'protestos-brasil',      titulo: 'Protestos em Cartório',                    render: d => <SecaoProtestos    data={d as ProtestosBrasil       | ApiErro} /> },
]
```

- [ ] **Verificar build**

```bash
cd /Users/samwelltech/CREDIARIO/frontend && npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Commit**

```bash
cd /Users/samwelltech/CREDIARIO && git add frontend/src/components/DadosExtrasView.tsx
git commit -m "feat: cards de exibicao para Boa Vista e Protestos em DadosExtrasView"
```

---

## Task 5: Algoritmo de recomendação — novos fatores

**Files:**
- Modify: `frontend/src/lib/recomendacao.ts`
- Modify: `frontend/src/lib/recomendacao.test.ts`

**Contexto:** O arquivo `recomendacao.ts` importa tipos de `../types` e acessa `dadosExtras['chave']`. Os blocos de extras existentes ficam entre as linhas 76–106. Adicionar dois novos blocos seguindo o mesmo padrão: verificar `!('erro' in ...)`, fazer cast, somar/subtrair pts, empurrar para `positivos`/`negativos`.

Os imports já incluem os tipos de DadosExtras — mas os novos tipos `BoaVistaAcertaPF` e `ProtestosBrasil` precisam ser importados.

- [ ] **Adicionar testes para os novos fatores em `frontend/src/lib/recomendacao.test.ts`**

Adicionar após os 4 testes existentes (linha 43):

```typescript
describe('boa-vista-acerta-pf', () => {
  it('sem pendencias e sem restricoes adiciona ponto positivo', () => {
    const rec = calcularRecomendacao(800, 'APROVADO', extraBase, {
      'boa-vista-acerta-pf': {
        pendenciasFinanceiras: { quantidadeOcorrencia: '0' },
        restricoes: { quantidadeOcorrencias: '0' },
        chequeSemFundoBacen: { quantidadeOcorrencia: '0' },
      },
    })
    expect(rec.fatoresPositivos.some(f => f.includes('pendências'))).toBe(true)
  })

  it('pendencias financeiras penalizam', () => {
    const rec = calcularRecomendacao(800, 'APROVADO', extraBase, {
      'boa-vista-acerta-pf': {
        pendenciasFinanceiras: { quantidadeOcorrencia: '3', valorTotal: '5000' },
        restricoes: { quantidadeOcorrencias: '0' },
        chequeSemFundoBacen: { quantidadeOcorrencia: '0' },
      },
    })
    expect(rec.fatoresNegativos.some(f => f.includes('pendência'))).toBe(true)
  })

  it('cheque sem fundo penaliza fortemente', () => {
    const semChq = calcularRecomendacao(800, 'APROVADO', extraBase, {})
    const comChq = calcularRecomendacao(800, 'APROVADO', extraBase, {
      'boa-vista-acerta-pf': {
        pendenciasFinanceiras: { quantidadeOcorrencia: '0' },
        restricoes: { quantidadeOcorrencias: '0' },
        chequeSemFundoBacen: { quantidadeOcorrencia: '2' },
      },
    })
    expect(comChq.fatoresNegativos.some(f => f.includes('Cheque'))).toBe(true)
    // cheque (-15) + sem pendencias (+5) = -10 liquido
    // score alto (APROVADO base 60 + score>701 + propria +15 + comprovante +15 + parcela +5) = 95 - 10 = 85 => ainda RECOMENDADO com cheque? Nao
    // 60 + 0 + 15 + 15 + 5 - 15 = 80 => RECOMENDADO (>= 75), mas com cheque (-15) + sem pend (+5) = 70 => nao muda nível mas consta como negativo
    expect(comChq.nivel).toBe('RECOMENDADO') // 80 pts liquido ainda >= 75
  })
})

describe('protestos-brasil', () => {
  it('sem protestos adiciona fator positivo', () => {
    const rec = calcularRecomendacao(800, 'APROVADO', extraBase, {
      'protestos-brasil': { constamProtestos: false, numeroTotalProtestos: 0 },
    })
    expect(rec.fatoresPositivos.some(f => f.includes('protesto'))).toBe(true)
  })

  it('protestos penalizam', () => {
    const rec = calcularRecomendacao(800, 'APROVADO', extraBase, {
      'protestos-brasil': { constamProtestos: true, numeroTotalProtestos: 3, valorTotalProtestos: '8500' },
    })
    expect(rec.fatoresNegativos.some(f => f.includes('protesto'))).toBe(true)
  })
})
```

- [ ] **Rodar os testes e confirmar que falham**

```bash
cd /Users/samwelltech/CREDIARIO/frontend && npx vitest run src/lib/recomendacao.test.ts
```

Esperado: os 5 novos testes falham (propriedades de `dadosExtras` não reconhecidas ainda).

- [ ] **Adicionar imports dos novos tipos em `frontend/src/lib/recomendacao.ts`**

Localizar a linha 1–4 com os imports e adicionar `BoaVistaAcertaPF` e `ProtestosBrasil`:

```typescript
import {
  Veredito, DadosExtras,
  NivelSocioeconomico, ProcessosJudiciais, AntecedentesCriminais, AssistenciaSocial,
  BoaVistaAcertaPF, ProtestosBrasil,
} from '../types'
```

- [ ] **Adicionar bloco Boa Vista em `frontend/src/lib/recomendacao.ts`**

Localizar o bloco `const assist = dadosExtras['assistencia-social-pf']` (linhas 101–106) e adicionar imediatamente após o bloco de `assist`:

```typescript
  const bv = dadosExtras['boa-vista-acerta-pf']
  if (bv && !('erro' in bv)) {
    const b = bv as BoaVistaAcertaPF
    const qtdPend = parseInt(b.pendenciasFinanceiras?.quantidadeOcorrencia ?? '0')
    const qtdRest = parseInt(b.restricoes?.quantidadeOcorrencias ?? '0')
    const qtdChq  = parseInt(b.chequeSemFundoBacen?.quantidadeOcorrencia ?? '0')

    if (qtdPend === 0)      { pts += 5;  positivos.push('Sem pendências financeiras (Boa Vista)') }
    else if (qtdPend <= 2)  { pts -= 10; negativos.push(`${qtdPend} pendência(s) financeira(s) (Boa Vista)`) }
    else                    { pts -= 20; negativos.push(`${qtdPend} pendências financeiras (Boa Vista)`) }

    if (qtdRest > 0) { pts -= 10; negativos.push(`${qtdRest} restrição(ões) cadastral(is) (Boa Vista)`) }
    if (qtdChq  > 0) { pts -= 15; negativos.push('Cheque sem fundo registrado (BACEN)') }
  }
```

- [ ] **Adicionar bloco Protestos Brasil em `frontend/src/lib/recomendacao.ts`**

Adicionar imediatamente após o bloco `bv`:

```typescript
  const prot = dadosExtras['protestos-brasil']
  if (prot && !('erro' in prot)) {
    const p = prot as ProtestosBrasil
    const total = p.numeroTotalProtestos ?? 0
    if (!p.constamProtestos)  { pts += 5;  positivos.push('Sem protestos em cartório') }
    else if (total <= 2)      { pts -= 10; negativos.push(`${total} protesto(s) em cartório`) }
    else                      { pts -= 20; negativos.push(`${total} protestos em cartório`) }
  }
```

- [ ] **Rodar os testes e confirmar que todos passam**

```bash
cd /Users/samwelltech/CREDIARIO/frontend && npx vitest run src/lib/recomendacao.test.ts
```

Esperado: todos os testes passam (os 4 originais + os 5 novos).

- [ ] **Verificar build completo**

```bash
cd /Users/samwelltech/CREDIARIO/frontend && npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Commit**

```bash
cd /Users/samwelltech/CREDIARIO && git add frontend/src/lib/recomendacao.ts frontend/src/lib/recomendacao.test.ts
git commit -m "feat: fatores Boa Vista e Protestos no algoritmo de recomendacao"
```

---

## Self-Review

**Cobertura da spec:**
- [x] `boa-vista-acerta-pf` e `protestos-brasil` adicionados ao SLUGS_PERMITIDOS — Task 2
- [x] Tipos TypeScript completos — Task 1
- [x] API_OPCOES com preços corretos (12,28 e 6,50) — Task 3
- [x] Cards de exibição com campos relevantes — Task 4
- [x] Algoritmo: pendências, restrições, cheque (Boa Vista) — Task 5
- [x] Algoritmo: protestos em cartório — Task 5
- [x] Testes para todos os novos fatores — Task 5

**Dependências entre tasks:**
- Task 1 (tipos) deve ser a primeira — Tasks 4 e 5 dependem dos novos tipos
- Tasks 2, 3, 4, 5 podem rodar em qualquer ordem após Task 1
- Task 4 antes de Task 5 não é necessário (arquivos distintos)
