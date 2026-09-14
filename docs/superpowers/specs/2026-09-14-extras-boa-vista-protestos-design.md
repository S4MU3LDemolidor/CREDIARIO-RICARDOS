# Extras: Boa Vista e Protestos Brasil

## Goal

Adicionar `boa-vista-acerta-pf` (R$ 12,28) e `protestos-brasil` (R$ 6,50) como APIs extras opcionais na consulta, ao lado das que já existem (nível socioeconômico, processos judiciais etc.). O operador ativa se quiser antes de submeter.

> **Decisão:** A FonteData não oferece Serasa nem SPC como score. Boa Vista é o segundo bureau disponível, mas como relatório de risco completo (não score simples). Portanto, Boa Vista e Protestos entram como extras — o score de crédito continua sendo sempre QUOD.

---

## O que NÃO muda

- Score de crédito: sempre QUOD (`score-credito-quod`)
- Limiares APROVADO/MANUAL/NEGADO
- Arquitetura de cache
- Autenticação e RLS

---

## Backend — Edge Function

### `SLUGS_PERMITIDOS`

Adicionar os dois novos slugs ao Set:

```typescript
const SLUGS_PERMITIDOS = new Set([
  'nivel-socioeconomico',
  'processos-agrupada',
  'antecedentes-federais',
  'registration-brazil',
  'cadastro-pf-plus',
  'assistencia-social-pf',
  'boa-vista-acerta-pf',   // novo
  'protestos-brasil',      // novo
])
```

Nenhuma outra mudança na Edge Function — `chamarApiExtra` já chama qualquer slug genericamente.

---

## Tipos TypeScript — `frontend/src/types/index.ts`

### `BoacVistaAcertaPF`

Incluir apenas os campos usados na exibição e no algoritmo:

```typescript
export interface BoaVistaAcertaPF {
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
```

### `ProtestosBrasil`

```typescript
export interface ProtestosBrasil {
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

### `DadosExtras` — adicionar os dois novos campos

```typescript
export type DadosExtras = {
  'nivel-socioeconomico'?:  NivelSocioeconomico | { erro: string }
  'processos-agrupada'?:    ProcessosJudiciais  | { erro: string }
  'antecedentes-federais'?: AntecedentesCriminais | { erro: string }
  'registration-brazil'?:   unknown
  'cadastro-pf-plus'?:      unknown
  'assistencia-social-pf'?: AssistenciaSocial   | { erro: string }
  'boa-vista-acerta-pf'?:   BoaVistaAcertaPF    | { erro: string }  // novo
  'protestos-brasil'?:      ProtestosBrasil      | { erro: string }  // novo
}
```

---

## Frontend — `Consulta.tsx`

### `API_OPCOES` — adicionar dois itens

```typescript
const API_OPCOES = [
  // ... existentes ...
  { slug: 'boa-vista-acerta-pf', nome: 'Análise Boa Vista',   descricao: 'Score, pendências financeiras, restrições, protestos, renda presumida e cheques sem fundo (Boa Vista SCPC)', preco: 12.28 },
  { slug: 'protestos-brasil',    nome: 'Protestos em Cartório', descricao: 'Existência e detalhamento de protestos em cartórios de todo o Brasil',                                      preco: 6.50  },
] as const
```

---

## Exibição — `DadosExtrasView.tsx`

Adicionar dois novos cards de exibição, seguindo o padrão visual dos cards existentes.

### Card `boa-vista-acerta-pf`

Mostrar em ordem de relevância para decisão de crédito:

1. **Decisão Boa Vista** — `decisao.descricao` (ex: "Favorável", "Desfavorável")
2. **Score Boa Vista** — `scores.ocorrencias[0].score` + `risco` + `classificacaoABC`
3. **Probabilidade de inadimplência** — `scores.ocorrencias[0].probabilidadeInadimplencia`
4. **Pendências financeiras** — quantidade + valor total (se `quantidadeOcorrencia` > "0")
5. **Restrições** — quantidade (se `quantidadeOcorrencias` > "0")
6. **Protestos** — quantidade + valor total (se `quantidadeOcorrencia` > "0")
7. **Cheque sem fundo (BACEN)** — quantidade (se > "0")
8. **Classe social** — `classeSocial`
9. **Renda presumida** — `rendaPresumida.descricao` ou `faixa`

### Card `protestos-brasil`

1. **Consta protesto** — `constamProtestos` (Sim/Não em badge)
2. Se sim: quantidade total + valor total
3. Lista por estado (estado + qtd + valor)

---

## Algoritmo de recomendação — `lib/recomendacao.ts`

### Novos fatores de `boa-vista-acerta-pf`

```typescript
const bv = dadosExtras['boa-vista-acerta-pf']
if (bv && !('erro' in bv)) {
  const b = bv as BoaVistaAcertaPF

  // Pendências financeiras
  const qtdPend = parseInt(b.pendenciasFinanceiras?.quantidadeOcorrencia ?? '0')
  if (qtdPend === 0)   { pts += 5;  positivos.push('Sem pendências financeiras (Boa Vista)') }
  else if (qtdPend <= 2) { pts -= 10; negativos.push(`${qtdPend} pendência(s) financeira(s) (Boa Vista)`) }
  else                 { pts -= 20; negativos.push(`${qtdPend} pendências financeiras (Boa Vista)`) }

  // Restrições
  const qtdRest = parseInt(b.restricoes?.quantidadeOcorrencias ?? '0')
  if (qtdRest > 0) { pts -= 10; negativos.push(`${qtdRest} restrição(ões) cadastral(is) (Boa Vista)`) }

  // Cheque sem fundo
  const qtdChq = parseInt(b.chequeSemFundoBacen?.quantidadeOcorrencia ?? '0')
  if (qtdChq > 0) { pts -= 15; negativos.push('Cheque sem fundo registrado (BACEN)') }
}
```

### Novos fatores de `protestos-brasil`

```typescript
const prot = dadosExtras['protestos-brasil']
if (prot && !('erro' in prot)) {
  const p = prot as ProtestosBrasil
  if (!p.constamProtestos)        { pts += 5;  positivos.push('Sem protestos em cartório') }
  else if ((p.numeroTotalProtestos ?? 0) <= 2) { pts -= 10; negativos.push(`${p.numeroTotalProtestos} protesto(s) em cartório`) }
  else                            { pts -= 20; negativos.push(`${p.numeroTotalProtestos} protestos em cartório`) }
}
```

---

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/consultar-cpf/index.ts` | adicionar slugs a `SLUGS_PERMITIDOS` |
| `frontend/src/types/index.ts` | tipos `BoaVistaAcertaPF`, `ProtestosBrasil`, atualizar `DadosExtras` |
| `frontend/src/pages/Consulta.tsx` | adicionar 2 itens em `API_OPCOES` |
| `frontend/src/components/DadosExtrasView.tsx` | cards de exibição dos 2 novos extras |
| `frontend/src/lib/recomendacao.ts` | fatores do algoritmo para Boa Vista e Protestos |
| `frontend/src/lib/recomendacao.test.ts` | testes dos novos fatores |
