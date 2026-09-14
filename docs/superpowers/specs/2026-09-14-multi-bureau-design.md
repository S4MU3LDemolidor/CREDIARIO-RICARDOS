# Multi-Bureau — Seleção de QUOD, Serasa e SPC

## Goal

Permitir que o operador escolha qual bureau de crédito consultar em cada pesquisa: QUOD, Serasa ou SPC. O cache e o histórico são separados por bureau.

## Decisões de design

- **Seleção por consulta** — radio button na tela de consulta, padrão QUOD.
- **Cache por `(cpf, bureau)`** — bureaus independentes; consultar Serasa de um CPF com QUOD em cache cobra normalmente.
- **Limiares iguais para todos** — APROVADO > 700, MANUAL 601–700, NEGADO ≤ 600. A FonteData normaliza todos os scores para 0–1000.
- **Mesmo formato de resposta** — `apiData.pessoaFisica.score` funciona para os 3 bureaus; sem mudança na extração do score.

---

## Banco de dados

### Nova coluna `bureau` em `consultas`

```sql
ALTER TABLE consultas
  ADD COLUMN bureau TEXT NOT NULL DEFAULT 'quod'
  CHECK (bureau IN ('quod', 'serasa', 'spc'));
```

### Recriar índice composto de cache incluindo `bureau`

O índice atual (`idx_consultas_cache`) cobre `(cpf, tipo_resultado, criado_em DESC)`. Com o bureau separando o cache, precisa incluir `bureau`:

```sql
DROP INDEX IF EXISTS idx_consultas_cache;
CREATE INDEX idx_consultas_cache
  ON consultas(cpf, bureau, tipo_resultado, criado_em DESC);
```

---

## Edge Function (`supabase/functions/consultar-cpf/index.ts`)

### Mapa de slugs

```typescript
const BUREAU_SLUGS = {
  quod:   'score-credito-quod',
  serasa: 'score-credito-serasa',
  spc:    'score-credito-spc',
} as const

type Bureau = keyof typeof BUREAU_SLUGS
```

### Body da requisição

Adicionar `bureau?: Bureau` (padrão `'quod'`):

```typescript
let body: {
  cpf: string
  documento_conferido: boolean
  motivo_forca?: string
  apis_extras?: string[]
  nome_cliente?: string
  bureau?: Bureau
}
```

### Cache query

Adicionar `.eq('bureau', bureau)` à query de cache existente:

```typescript
const { data: cached } = await supabase
  .from('consultas')
  .select('id, score, veredito, faixa, capacidade_pagamento, perfil_credito, criado_em')
  .eq('cpf', cpfDigits)
  .eq('bureau', bureau)           // <-- novo
  .eq('tipo_resultado', 'ok')
  .gte('criado_em', cacheLimit.toISOString())
  .order('criado_em', { ascending: false })
  .limit(1)
  .maybeSingle()
```

### Chamada à FonteData

Substituir URL hardcoded pelo slug dinâmico:

```typescript
const bureauSlug = BUREAU_SLUGS[bureau]
const apiRes = await fetch(
  `https://app.fontedata.com/api/v1/consulta/${bureauSlug}?cpf=${cpfDigits}`,
  { headers: { 'X-API-Key': fontedataApiKey } }
)
```

### INSERT/UPDATE

Incluir `bureau` em todos os inserts:

```typescript
await supabase.from('consultas').insert({
  // ...campos existentes...
  bureau,
  apis_utilizadas: [bureauSlug, ...slugsExtras],
})
```

O campo `apis_utilizadas` continua gravando o slug completo (`'score-credito-serasa'` etc.) para rastreabilidade.

---

## Frontend

### Tipo `Bureau` em `frontend/src/types/index.ts`

```typescript
export type Bureau = 'quod' | 'serasa' | 'spc'
```

### Contexto compartilhado — `frontend/src/contexts/BureauContext.tsx` (criar)

O bureau selecionado na sidebar precisa ser lido pela página Consulta. Como Sidebar e Consulta são irmãos no AppLayout, o estado é compartilhado via contexto React:

```typescript
import { createContext, useContext, useState } from 'react'
import { Bureau } from '../types'

interface BureauContextValue {
  bureau: Bureau
  setBureau: (b: Bureau) => void
}

const BureauContext = createContext<BureauContextValue>({
  bureau: 'quod',
  setBureau: () => {},
})

export function BureauProvider({ children }: { children: React.ReactNode }) {
  const [bureau, setBureau] = useState<Bureau>('quod')
  return (
    <BureauContext.Provider value={{ bureau, setBureau }}>
      {children}
    </BureauContext.Provider>
  )
}

export function useBureau() {
  return useContext(BureauContext)
}
```

`BureauProvider` envolve `<App />` em `main.tsx` (junto com `AuthProvider` e `ErrorBoundary`).

### Sidebar — `frontend/src/components/Sidebar.tsx`

Abaixo dos links de navegação, adicionar o seletor de bureau. O bureau selecionado fica destacado com a cor primária (`#aa0000`). Cada opção mostra nome e custo:

```typescript
const BUREAU_OPCOES = [
  { value: 'quod'   as Bureau, label: 'QUOD',   custo: 2.34 },
  { value: 'serasa' as Bureau, label: 'Serasa',  custo: 2.34 }, // atualizar com preço real
  { value: 'spc'    as Bureau, label: 'SPC',     custo: 2.34 }, // atualizar com preço real
]
```

> **Ação pendente:** verificar os preços de Serasa e SPC na conta FonteData e atualizar `custo` antes de ir a produção.

UI na sidebar (abaixo do menu "Consulta / Histórico"):

```tsx
<div className="mt-6 px-3">
  <p className="text-xs font-semibold text-[#111827] mb-2">Bureau</p>
  <div className="space-y-0.5">
    {BUREAU_OPCOES.map(b => (
      <button
        key={b.value}
        onClick={() => setBureau(b.value)}
        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
          bureau === b.value
            ? 'bg-[#fef2f2] text-[#aa0000] font-semibold'
            : 'text-[#374151] hover:bg-[#f3f4f6]'
        }`}
      >
        <span>{b.label}</span>
        <span className="text-xs text-[#9ca3af] ml-1">R$ {b.custo.toFixed(2)}</span>
      </button>
    ))}
  </div>
</div>
```

O estilo ativo replica exatamente o `NavLink` existente para consistência visual.

### Consulta — `frontend/src/pages/Consulta.tsx`

Remove o estado local `bureau` (que não existia antes — bureau já foi sempre implícito como QUOD). Passa a ler do contexto:

```typescript
const { bureau } = useBureau()
```

O label do score no resultado muda de "Score de Crédito" para label dinâmico:

```typescript
const BUREAU_LABEL = { quod: 'QUOD', serasa: 'Serasa', spc: 'SPC' }
// Exibir: `Score ${BUREAU_LABEL[bureau]}`
```

O `bureau` é enviado no payload do `useConsulta`.

### Hook `useConsulta.ts`

Adicionar `bureau: Bureau` ao tipo de parâmetros e incluir no body da chamada à Edge Function.

### Histórico — badge de bureau

Em `useHistorico.ts`, adicionar `bureau` ao SELECT explícito.

Em `Historico.tsx`, ao lado do score na tabela e no painel de detalhe, exibir uma badge pequena:

```tsx
<span className="text-[10px] font-mono text-[#9ca3af] uppercase tracking-wider">
  {row.bureau ?? 'QUOD'}
</span>
```

---

## Tipos atualizados

### `ConsultaRow` em `frontend/src/types/index.ts`

Adicionar campo opcional para compatibilidade com linhas antigas:

```typescript
bureau?: Bureau | null
```

### Resposta da Edge Function

A resposta JSON já retorna os campos do score. Adicionar `bureau` ao objeto retornado:

```typescript
return jsonResponse({
  tipo: 'ok',
  bureau,
  // ...demais campos
})
```

---

## Compatibilidade retroativa

- Linhas antigas na tabela `consultas` não têm `bureau` — a migration usa `DEFAULT 'quod'`, então todas as linhas existentes ficam como QUOD automaticamente.
- O frontend usa `row.bureau ?? 'QUOD'` para linhas antigas.

---

## O que NÃO muda

- Limiares de APROVADO/MANUAL/NEGADO
- Algoritmo de recomendação (`calcularRecomendacao`)
- APIs extras (nível socioeconômico, processos, etc.)
- Lógica de cache hit/miss (apenas adiciona `bureau` ao filtro)
- Autenticação e RLS

---

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/20260914000002_bureau.sql` (criar) | ALTER TABLE + recriar índice |
| `supabase/functions/consultar-cpf/index.ts` | BUREAU_SLUGS, bureau no body/cache/insert/response |
| `frontend/src/types/index.ts` | tipo `Bureau`, `bureau?` em `ConsultaRow` |
| `frontend/src/contexts/BureauContext.tsx` (criar) | BureauProvider + useBureau hook |
| `frontend/src/main.tsx` | envolver App com BureauProvider |
| `frontend/src/components/Sidebar.tsx` | seletor de bureau abaixo do menu |
| `frontend/src/pages/Consulta.tsx` | usar useBureau(), label dinâmico, bureau no payload |
| `frontend/src/hooks/useConsulta.ts` | `bureau` no payload |
| `frontend/src/hooks/useHistorico.ts` | adicionar `bureau` ao SELECT explícito |
| `frontend/src/pages/Historico.tsx` | badge de bureau na listagem |
