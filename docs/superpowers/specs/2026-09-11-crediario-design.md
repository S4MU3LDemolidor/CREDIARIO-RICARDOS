# Design: Sistema de Análise de Crédito para Crediário

**Data:** 2026-09-11
**Status:** Aprovado

---

## 1. Contexto e objetivo

Sistema web interno para uma rede de 4 lojas físicas de varejo. Permite que operadores consultem o score de crédito de clientes via CPF antes de abrir um crediário, reduzindo inadimplência com base em dado objetivo. Volume estimado: ~10 crediários aprovados/dia no conjunto das lojas. Cada consulta à API externa custa ~R$ 2,34 — controle de custo é requisito central.

---

## 2. Arquitetura geral (Monorepo)

```
CREDIARIO/
├── frontend/                  # React 18 + Vite 5 + TypeScript + Tailwind CSS v3
│   ├── src/
│   │   ├── components/        # Button, Badge, Modal, Spinner, Header
│   │   ├── pages/             # Login, Consulta, Historico
│   │   ├── hooks/             # useAuth, useConsulta, useHistorico
│   │   ├── lib/               # supabaseClient.ts, formatters.ts
│   │   └── types/             # Resultado, Consulta, Profile
│   ├── .env.example
│   └── vite.config.ts
│
├── supabase/
│   ├── migrations/            # SQL versionado
│   └── functions/
│       └── consultar-cpf/
│           └── index.ts       # Edge Function Deno
│
├── docs/superpowers/specs/
├── .gitignore
└── README.md
```

- **Frontend** deploy na Vercel
- **Edge Functions + DB** no Supabase hosted
- **Roteamento:** React Router v6
- **Sem biblioteca de UI pesada** — componentes Tailwind puros

---

## 3. Schema do banco (Postgres / Supabase)

### `lojas`
```sql
id        uuid PRIMARY KEY DEFAULT gen_random_uuid()
nome      text NOT NULL
criado_em timestamptz DEFAULT now()
```

### `profiles`
```sql
id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
nome      text NOT NULL
loja_id   uuid NOT NULL REFERENCES lojas(id)
criado_em timestamptz DEFAULT now()
```

### `consultas`
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
cpf                 text NOT NULL                          -- so digitos, 11 chars
tipo_resultado      text NOT NULL                          -- 'ok' | 'cpf_nao_encontrado' | 'erro_sistema'
score               integer                                -- nullable
veredito            text                                   -- 'APROVADO' | 'MANUAL' | 'NEGADO' | null
faixa               text                                   -- faixaScore da API (so display) | null
motivo_erro         text                                   -- nullable
loja_id             uuid NOT NULL REFERENCES lojas(id)
operador_id         uuid NOT NULL REFERENCES profiles(id)
documento_conferido boolean NOT NULL DEFAULT false
forcou_nova         boolean NOT NULL DEFAULT false
motivo_forca        text                                   -- justificativa do modal
criado_em           timestamptz DEFAULT now()
```

### Indices
```sql
CREATE INDEX ON consultas(cpf);
CREATE INDEX ON consultas(loja_id, criado_em DESC);
CREATE INDEX ON consultas(tipo_resultado, criado_em DESC);
```

### RLS
- `lojas`: leitura para qualquer `authenticated`; escrita bloqueada.
- `profiles`: cada usuario le/escreve apenas o proprio perfil.
- `consultas`: operador le/insere apenas onde `loja_id` corresponde ao seu perfil (`auth.uid()` -> `profiles.loja_id`). Zero acesso entre lojas.

---

## 4. Edge Function `consultar-cpf`

**Endpoint:** `POST /functions/v1/consultar-cpf`
**Auth:** JWT Supabase (validado automaticamente)

### Payload de entrada
```ts
{ cpf: string; documento_conferido: boolean; motivo_forca?: string }
```

### Fluxo
1. Valida JWT -> obtem `operador_id`
2. Busca `profiles` -> obtem `loja_id`
3. Se `motivo_forca` ausente: verifica cache (consulta `tipo=ok` nos ultimos 30 dias para o CPF)
   - Cache hit -> retorna resultado salvo com `cache_hit: true`, sem cobrar
4. Chama `GET https://app.fontedata.com/api/v1/consulta/score-credito-quod?cpf=...` com `X-API-Key`
5. Interpreta resposta:
   - `200` + `pessoaFisica.score` numerico -> `tipo: "ok"`, aplica regua
   - `200` sem `score` numerico -> `tipo: "erro_sistema"`
   - `404` -> `tipo: "cpf_nao_encontrado"`
   - `403` -> `tipo: "erro_sistema"` (motivo: saldo insuficiente)
   - outros -> `tipo: "erro_sistema"`
6. Grava em `consultas` (sempre, exceto cache hit)
7. Retorna resultado tipado

### Regra de decisao (so pelo numero)
```
score <= 600  -> "NEGADO"
601-700       -> "MANUAL"
>= 701        -> "APROVADO"
```

### Tipo de retorno
```ts
type Resultado =
  | { tipo: "ok"; veredito: "APROVADO" | "MANUAL" | "NEGADO"; score: number; faixa: string | null; cache_hit: boolean; cache_data?: string }
  | { tipo: "cpf_nao_encontrado" }
  | { tipo: "erro_sistema"; motivo: string }
```

### Secrets
- `FONTEDATA_API_KEY` -- setado via `supabase secrets set`
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` -- injetados automaticamente pelo Supabase

### Janela de cache
Configuravel via variavel de ambiente `CACHE_DIAS` (padrao: `30`).

---

## 5. Paginas do frontend

### Autenticacao
- Toda rota protegida por `<ProtectedRoute>` -- redireciona para `/login` sem sessao valida
- Sem botao de signup; operadores criados manualmente via SQL

### `/login`
- Campos e-mail + senha + botao "Entrar"
- Sem signup, sem "esqueci minha senha"

### `/` -- Consulta (tela principal)
Estados:
1. **Idle:** campo CPF (mascara `000.000.000-00`, envia so digitos), checkbox "Documento do cliente conferido" (obrigatoria), botao "Consultar" (desabilitado sem checkbox)
2. **Loading:** spinner
3. **Cache hit:** resultado + banner "Resultado de consulta anterior -- DD/MM/AAAA -- sem nova cobranca" + botao "Forcar nova consulta"
4. **Resultado `ok`:** score grande com cor por faixa (vermelho <=600 / amarelo 601-700 / verde >=701), veredito em texto
5. **`cpf_nao_encontrado`:** tela neutra -- "CPF nao localizado -- seguir para analise manual"
6. **`erro_sistema`:** tela de alerta -- "Consulta indisponivel. Tente novamente." (motivo tecnico visivel apenas na tela)

**Modal "Forcar nova consulta":**
- Textarea obrigatoria: motivo da nova consulta
- Botoes: Cancelar / Confirmar nova consulta
- Ao confirmar: envia `motivo_forca`, grava `forcou_nova=true` no log

### `/historico` -- Historico
- Tabela paginada: CPF, Score, Veredito, Operador, Data/Hora
- Filtros: CPF (texto livre), Operador (dropdown), Veredito (dropdown: todos/aprovado/manual/negado/nao encontrado/erro), Data inicio, Data fim
- Botao "Exportar CSV" -- geracao client-side dos dados filtrados
- Dados restritos a loja do operador logado (RLS)

### Header
Nome da loja + nome do operador + link "Historico" + botao "Sair"

---

## 6. Seguranca e LGPD

- `FONTEDATA_API_KEY` jamais no frontend -- so como secret da Edge Function
- `anon key` do Supabase e segura no frontend (protegida por RLS); `service_role` nunca vai ao cliente
- Cada consulta grava `operador_id`, `loja_id`, `documento_conferido` e `criado_em` -- trilha de auditoria LGPD
- Finalidade declarada: analise de credito para concessao de crediario
- `.gitignore` cobre `.env` e `.env.local`

---

## 7. Configuracao passo a passo (resumo para o README)

1. Criar projeto no Supabase -> copiar `Project URL` e `anon key` (Project Settings -> API)
2. Rodar migrations: `supabase db push`
3. Preencher `frontend/.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
4. Setar secret da FonteData: `supabase secrets set FONTEDATA_API_KEY=sua_chave`
5. Deploy das Edge Functions: `supabase functions deploy consultar-cpf`
6. Criar lojas via SQL; criar primeiro operador via painel Supabase Auth + INSERT em `profiles`
7. Deploy do frontend na Vercel com as env vars do passo 3

---

## 8. Fora de escopo (v1)

- Recuperacao de senha (operadores contatam o admin)
- Painel administrativo de usuarios/lojas no app
- Notificacoes ou alertas automaticos
- Relatorios analiticos alem do historico filtrado
