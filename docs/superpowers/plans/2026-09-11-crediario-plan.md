# Crediário — Sistema de Análise de Crédito — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um sistema web interno que permite operadores de loja consultar o score de crédito de clientes via CPF antes de abrir um crediário, com cache para economizar custos de API.

**Architecture:** Monorepo com `frontend/` (React + Vite + Tailwind) e `supabase/` (migrations + Edge Function). O frontend é deployado na Vercel; a Edge Function `consultar-cpf` roda no Supabase e é a única peça que acessa a API da FonteData com a chave secreta. O banco Postgres gerencia o log/cache de consultas com RLS por loja.

**Tech Stack:** React 18, Vite 5, TypeScript, Tailwind CSS v3, React Router v6, Supabase (Auth + Postgres + Edge Functions Deno), Vitest, @testing-library/react

---

## Mapa de arquivos

```
CREDIARIO/
├── .gitignore
├── README.md
├── supabase/
│   ├── config.toml                          (gerado por supabase init)
│   ├── migrations/
│   │   └── 20260911000001_initial_schema.sql  -- tabelas lojas, profiles, consultas + RLS
│   └── functions/
│       └── consultar-cpf/
│           ├── index.ts                     -- Edge Function principal
│           └── index.test.ts                -- testes Deno da regra de decisao
└── frontend/
    ├── package.json
    ├── vite.config.ts                       -- config do Vite + Vitest
    ├── tsconfig.json                        -- adiciona vitest/globals
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── .env.example
    └── src/
        ├── main.tsx                         -- root render, AuthProvider
        ├── App.tsx                          -- React Router routes
        ├── index.css                        -- @tailwind base/components/utilities
        ├── test-setup.ts                    -- @testing-library/jest-dom
        ├── types/
        │   └── index.ts                     -- Resultado, Profile, ConsultaRow, Veredito
        ├── lib/
        │   ├── supabaseClient.ts            -- singleton createClient
        │   ├── formatters.ts                -- formatCPF, stripCPF, isValidCPF, formatDate, exportToCSV
        │   └── formatters.test.ts           -- testes unitarios de formatters
        ├── contexts/
        │   └── AuthContext.tsx              -- AuthProvider + useAuth hook
        ├── components/
        │   ├── ProtectedRoute.tsx           -- redireciona para /login sem sessao
        │   ├── Header.tsx                   -- nome da loja + operador + nav
        │   ├── Spinner.tsx                  -- indicador de loading
        │   ├── Badge.tsx                    -- VeredittoBadge + scoreColor + scoreBg
        │   ├── Badge.test.tsx               -- testes de cor por score e texto de veredito
        │   ├── Modal.tsx                    -- wrapper de modal generico
        │   ├── Modal.test.tsx               -- testes de open/close/esc
        │   └── ForcarNovaModal.tsx          -- modal com textarea obrigatoria
        ├── hooks/
        │   ├── useConsulta.ts               -- estado da consulta, chama Edge Function
        │   └── useHistorico.ts              -- fetch, filtros client-side, paginacao, CSV
        └── pages/
            ├── Login.tsx                    -- email + senha, sem signup
            ├── Consulta.tsx                 -- pagina principal com todos os estados
            └── Historico.tsx                -- tabela com filtros + exportar CSV
```

---

## Task 1: Monorepo scaffold

**Files:**
- Create: `.gitignore`
- Create: `frontend/` (via vite scaffold)
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json` (modifica o gerado)
- Create: `frontend/tailwind.config.js`
- Create: `frontend/src/index.css`
- Create: `frontend/src/test-setup.ts`
- Create: `supabase/` (via supabase init)

- [ ] **Step 1: Inicializar git e criar .gitignore**

```bash
cd /Users/samwelltech/CREDIARIO
git init
```

Criar `.gitignore`:
```
# env
.env
.env.local
.env.*.local

# deps
node_modules/
frontend/node_modules/

# build
frontend/dist/
frontend/.vite/

# supabase local
.supabase/

# OS
.DS_Store
Thumbs.db
```

- [ ] **Step 2: Scaffold do frontend com Vite**

```bash
cd /Users/samwelltech/CREDIARIO
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

- [ ] **Step 3: Instalar dependencias de producao e desenvolvimento**

```bash
cd /Users/samwelltech/CREDIARIO/frontend
npm install react-router-dom @supabase/supabase-js
npm install -D tailwindcss@3 postcss autoprefixer vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @vitejs/plugin-react
npx tailwindcss init -p
```

- [ ] **Step 4: Configurar Tailwind**

Sobrescrever `frontend/tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

Sobrescrever `frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Configurar Vite com Vitest**

Sobrescrever `frontend/vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 6: Adicionar tipos vitest ao tsconfig**

No `frontend/tsconfig.json` gerado pelo Vite, adicionar `"types": ["vitest/globals"]` em `compilerOptions`. O arquivo ficara assim:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 7: Criar test-setup.ts**

Criar `frontend/src/test-setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Adicionar script de teste ao package.json**

No `frontend/package.json`, adicionar em `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 9: Inicializar Supabase**

```bash
cd /Users/samwelltech/CREDIARIO
npx supabase init
```

Isso cria `supabase/config.toml` e a estrutura de pastas.

- [ ] **Step 10: Verificar que os testes rodam (sem falhar)**

```bash
cd /Users/samwelltech/CREDIARIO/frontend
npm test
```

Esperado: `No test files found` ou 0 failures (ainda nao ha testes).

- [ ] **Step 11: Commit**

```bash
cd /Users/samwelltech/CREDIARIO
git add .gitignore supabase/config.toml frontend/package.json frontend/vite.config.ts frontend/tsconfig.json frontend/tailwind.config.js frontend/postcss.config.js frontend/src/index.css frontend/src/test-setup.ts frontend/index.html frontend/tsconfig.node.json
git commit -m "chore: scaffold monorepo (Vite + Supabase)"
```

---

## Task 2: Tipos e lib compartilhada

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/lib/formatters.ts`
- Create: `frontend/src/lib/formatters.test.ts`
- Create: `frontend/src/lib/supabaseClient.ts`
- Create: `frontend/.env.example`

- [ ] **Step 1: Escrever os testes de formatters**

Criar `frontend/src/lib/formatters.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { stripCPF, formatCPF, isValidCPF } from './formatters'

describe('stripCPF', () => {
  it('remove pontos e traco', () => {
    expect(stripCPF('123.456.789-09')).toBe('12345678909')
  })
  it('deixa so digitos inalterados', () => {
    expect(stripCPF('12345678909')).toBe('12345678909')
  })
  it('remove espacos e outros caracteres', () => {
    expect(stripCPF('123 456 789 09')).toBe('12345678909')
  })
})

describe('formatCPF', () => {
  it('formata 11 digitos com mascara completa', () => {
    expect(formatCPF('12345678909')).toBe('123.456.789-09')
  })
  it('formata CPF ja mascarado sem duplicar', () => {
    expect(formatCPF('123.456.789-09')).toBe('123.456.789-09')
  })
  it('formata CPF parcial com 6 digitos', () => {
    expect(formatCPF('123456')).toBe('123.456')
  })
  it('formata CPF parcial com 3 digitos', () => {
    expect(formatCPF('123')).toBe('123')
  })
  it('formata CPF parcial com 9 digitos', () => {
    expect(formatCPF('123456789')).toBe('123.456.789')
  })
})

describe('isValidCPF', () => {
  it('retorna true para CPF com 11 digitos', () => {
    expect(isValidCPF('12345678909')).toBe(true)
  })
  it('retorna true para CPF mascarado com 11 digitos', () => {
    expect(isValidCPF('123.456.789-09')).toBe(true)
  })
  it('retorna false para CPF curto', () => {
    expect(isValidCPF('12345678')).toBe(false)
  })
  it('retorna false para string vazia', () => {
    expect(isValidCPF('')).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar testes e confirmar que falham**

```bash
cd /Users/samwelltech/CREDIARIO/frontend
npm test
```

Esperado: FAIL — `Cannot find module './formatters'`

- [ ] **Step 3: Implementar formatters.ts**

Criar `frontend/src/lib/formatters.ts`:
```ts
export function stripCPF(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

export function formatCPF(cpf: string): string {
  const digits = stripCPF(cpf).slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

export function isValidCPF(cpf: string): boolean {
  return stripCPF(cpf).length === 11
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function exportToCSV(rows: Record<string, unknown>[], filename: string): void {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escape = (val: unknown) => {
    const str = String(val ?? '')
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str
  }
  const csvContent = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: Rodar testes e confirmar que passam**

```bash
cd /Users/samwelltech/CREDIARIO/frontend
npm test
```

Esperado: PASS — todos os testes de formatters verde.

- [ ] **Step 5: Criar types/index.ts**

Criar `frontend/src/types/index.ts`:
```ts
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
```

- [ ] **Step 6: Criar supabaseClient.ts**

Criar `frontend/src/lib/supabaseClient.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variaveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nao configuradas. Copie .env.example para .env e preencha.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 7: Criar .env.example**

Criar `frontend/.env.example`:
```
# URL do projeto Supabase
# Encontre em: Project Settings > API > Project URL
VITE_SUPABASE_URL=https://your-project-id.supabase.co

# Chave anonima do Supabase (segura para expor no frontend — protegida por RLS)
# Encontre em: Project Settings > API > Project API keys > anon public
# ATENCAO: nunca use a chave service_role aqui
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 8: Rodar testes**

```bash
cd /Users/samwelltech/CREDIARIO/frontend
npm test
```

Esperado: PASS — sem regressoes.

- [ ] **Step 9: Commit**

```bash
cd /Users/samwelltech/CREDIARIO
git add frontend/src/types/index.ts frontend/src/lib/formatters.ts frontend/src/lib/formatters.test.ts frontend/src/lib/supabaseClient.ts frontend/.env.example
git commit -m "feat: tipos, formatters e supabase client"
```

---

## Task 3: Migration do banco

**Files:**
- Create: `supabase/migrations/20260911000001_initial_schema.sql`

- [ ] **Step 1: Criar o arquivo de migration**

Criar `supabase/migrations/20260911000001_initial_schema.sql`:
```sql
-- =============================================
-- Tabela: lojas
-- =============================================
CREATE TABLE lojas (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL,
  criado_em timestamptz DEFAULT now()
);

-- =============================================
-- Tabela: profiles (vinculada ao auth.users)
-- =============================================
CREATE TABLE profiles (
  id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome      text NOT NULL,
  loja_id   uuid NOT NULL REFERENCES lojas(id),
  criado_em timestamptz DEFAULT now()
);

-- =============================================
-- Tabela: consultas (log + cache)
-- =============================================
CREATE TABLE consultas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf                 text NOT NULL,
  tipo_resultado      text NOT NULL
                        CHECK (tipo_resultado IN ('ok', 'cpf_nao_encontrado', 'erro_sistema')),
  score               integer,
  veredito            text
                        CHECK (veredito IN ('APROVADO', 'MANUAL', 'NEGADO') OR veredito IS NULL),
  faixa               text,
  motivo_erro         text,
  loja_id             uuid NOT NULL REFERENCES lojas(id),
  operador_id         uuid NOT NULL REFERENCES profiles(id),
  documento_conferido boolean NOT NULL DEFAULT false,
  forcou_nova         boolean NOT NULL DEFAULT false,
  motivo_forca        text,
  criado_em           timestamptz DEFAULT now()
);

-- =============================================
-- Indices
-- =============================================
CREATE INDEX idx_consultas_cpf       ON consultas(cpf);
CREATE INDEX idx_consultas_loja_data ON consultas(loja_id, criado_em DESC);
CREATE INDEX idx_consultas_tipo_data ON consultas(tipo_resultado, criado_em DESC);

-- =============================================
-- Row Level Security
-- =============================================
ALTER TABLE lojas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;

-- lojas: qualquer autenticado pode ler, ninguem pode escrever pelo app
CREATE POLICY "lojas_select_authenticated" ON lojas
  FOR SELECT TO authenticated USING (true);

-- profiles: cada usuario ve e edita apenas o proprio perfil
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- consultas: operador le/insere apenas registros da propria loja
CREATE POLICY "consultas_select_own_loja" ON consultas
  FOR SELECT TO authenticated
  USING (loja_id = (SELECT loja_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "consultas_insert_own_loja" ON consultas
  FOR INSERT TO authenticated
  WITH CHECK (
    loja_id    = (SELECT loja_id FROM profiles WHERE id = auth.uid())
    AND operador_id = auth.uid()
  );
```

- [ ] **Step 2: Aplicar a migration ao projeto Supabase**

Primeiro vincular ao projeto remoto (substitua `<project-ref>` pelo ID do seu projeto Supabase):
```bash
cd /Users/samwelltech/CREDIARIO
npx supabase link --project-ref <project-ref>
```

Depois aplicar:
```bash
npx supabase db push
```

Esperado: migration aplicada sem erros.

- [ ] **Step 3: Inserir lojas iniciais via SQL**

No painel do Supabase > SQL Editor, executar:
```sql
INSERT INTO lojas (nome) VALUES
  ('Loja 1'),
  ('Loja 2'),
  ('Loja 3'),
  ('Loja 4');
```

- [ ] **Step 4: Commit**

```bash
cd /Users/samwelltech/CREDIARIO
git add supabase/migrations/20260911000001_initial_schema.sql
git commit -m "feat: migration inicial com schema, indices e RLS"
```

---

## Task 4: Edge Function `consultar-cpf`

**Files:**
- Create: `supabase/functions/consultar-cpf/index.ts`
- Create: `supabase/functions/consultar-cpf/index.test.ts`

- [ ] **Step 1: Escrever os testes Deno da regra de decisao**

Criar `supabase/functions/consultar-cpf/index.test.ts`:
```ts
import { assertEquals } from 'jsr:@std/assert'
import { aplicarRegra } from './index.ts'

Deno.test('score 0 -> NEGADO',    () => assertEquals(aplicarRegra(0),    'NEGADO'))
Deno.test('score 600 -> NEGADO',  () => assertEquals(aplicarRegra(600),  'NEGADO'))
Deno.test('score 601 -> MANUAL',  () => assertEquals(aplicarRegra(601),  'MANUAL'))
Deno.test('score 700 -> MANUAL',  () => assertEquals(aplicarRegra(700),  'MANUAL'))
Deno.test('score 701 -> APROVADO',() => assertEquals(aplicarRegra(701),  'APROVADO'))
Deno.test('score 1000 -> APROVADO',()=> assertEquals(aplicarRegra(1000), 'APROVADO'))
```

- [ ] **Step 2: Rodar testes Deno (esperar falha — funcao ainda nao existe)**

```bash
deno test supabase/functions/consultar-cpf/index.test.ts
```

Esperado: erro de importacao — `aplicarRegra` nao existe ainda.

- [ ] **Step 3: Implementar a Edge Function**

Criar `supabase/functions/consultar-cpf/index.ts`:
```ts
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
```

- [ ] **Step 4: Rodar testes Deno e confirmar que passam**

```bash
deno test supabase/functions/consultar-cpf/index.test.ts
```

Esperado: 6 tests PASS.

- [ ] **Step 5: Configurar o secret da FonteData**

```bash
npx supabase secrets set FONTEDATA_API_KEY=sua_chave_real_aqui
```

(Substitua `sua_chave_real_aqui` pela chave da sua conta FonteData)

Verificar que foi setado:
```bash
npx supabase secrets list
```

Esperado: `FONTEDATA_API_KEY` na lista.

- [ ] **Step 6: Deploy da Edge Function**

```bash
cd /Users/samwelltech/CREDIARIO
npx supabase functions deploy consultar-cpf
```

Esperado: `Deployed Functions consultar-cpf`

- [ ] **Step 7: Testar a funcao com curl**

Primeiro obtenha um JWT valido fazendo login pela API do Supabase (substitua os valores):
```bash
curl -X POST 'https://<project-ref>.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: <anon-key>' \
  -H 'Content-Type: application/json' \
  -d '{"email":"seu@email.com","password":"suasenha"}'
```

Copie o `access_token` da resposta e use:
```bash
curl -X POST 'https://<project-ref>.supabase.co/functions/v1/consultar-cpf' \
  -H 'Authorization: Bearer <access_token>' \
  -H 'Content-Type: application/json' \
  -d '{"cpf":"12345678909","documento_conferido":true}'
```

Esperado: JSON com `tipo: "cpf_nao_encontrado"` ou `tipo: "ok"` com score, ou `tipo: "erro_sistema"` — nunca um crash.

- [ ] **Step 8: Commit**

```bash
cd /Users/samwelltech/CREDIARIO
git add supabase/functions/consultar-cpf/index.ts supabase/functions/consultar-cpf/index.test.ts
git commit -m "feat: edge function consultar-cpf com cache, regra de decisao e log"
```

---

## Task 5: Auth (AuthContext + ProtectedRoute + Login)

**Files:**
- Create: `frontend/src/contexts/AuthContext.tsx`
- Create: `frontend/src/components/ProtectedRoute.tsx`
- Create: `frontend/src/pages/Login.tsx`
- Create: `frontend/src/components/Spinner.tsx` (necessario para ProtectedRoute)

- [ ] **Step 1: Criar Spinner.tsx**

Criar `frontend/src/components/Spinner.tsx`:
```tsx
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }
  return (
    <div
      className={`${sizes[size]} animate-spin rounded-full border-2 border-gray-300 border-t-blue-600`}
      role="status"
      aria-label="Carregando"
    />
  )
}
```

- [ ] **Step 2: Criar AuthContext.tsx**

Criar `frontend/src/contexts/AuthContext.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { Profile } from '../types'

type AuthContextType = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<Error | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]   = useState<Session | null>(null)
  const [user, setUser]         = useState<User | null>(null)
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id, nome, loja_id, criado_em, lojas(nome)')
      .eq('id', userId)
      .single()
    setProfile(data as Profile | null)
    setLoading(false)
  }

  async function signIn(email: string, password: string): Promise<Error | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
```

- [ ] **Step 3: Criar ProtectedRoute.tsx**

Criar `frontend/src/components/ProtectedRoute.tsx`:
```tsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from './Spinner'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}
```

- [ ] **Step 4: Criar Login.tsx**

Criar `frontend/src/pages/Login.tsx`:
```tsx
import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const { signIn, session } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  // Ja autenticado: redireciona
  if (session) {
    navigate('/', { replace: true })
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const err = await signIn(email, password)
    setLoading(false)
    if (err) setError('E-mail ou senha invalidos.')
    else navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Crediário</h1>
        <p className="text-gray-400 text-sm mb-6">Análise de crédito</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium
                       hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Rodar testes**

```bash
cd /Users/samwelltech/CREDIARIO/frontend
npm test
```

Esperado: PASS — sem regressoes.

- [ ] **Step 6: Commit**

```bash
cd /Users/samwelltech/CREDIARIO
git add frontend/src/components/Spinner.tsx frontend/src/contexts/AuthContext.tsx frontend/src/components/ProtectedRoute.tsx frontend/src/pages/Login.tsx
git commit -m "feat: auth context, protected route e pagina de login"
```

---

## Task 6: Componentes compartilhados

**Files:**
- Create: `frontend/src/components/Badge.tsx`
- Create: `frontend/src/components/Badge.test.tsx`
- Create: `frontend/src/components/Modal.tsx`
- Create: `frontend/src/components/Modal.test.tsx`
- Create: `frontend/src/components/ForcarNovaModal.tsx`
- Create: `frontend/src/components/Header.tsx`

- [ ] **Step 1: Escrever testes do Badge**

Criar `frontend/src/components/Badge.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { VeredittoBadge, scoreColor, scoreBg } from './Badge'

describe('VeredittoBadge', () => {
  it('exibe texto Aprovado para APROVADO', () => {
    render(<VeredittoBadge veredito="APROVADO" />)
    expect(screen.getByText('Aprovado')).toBeInTheDocument()
  })
  it('exibe texto Analise Manual para MANUAL', () => {
    render(<VeredittoBadge veredito="MANUAL" />)
    expect(screen.getByText('Análise Manual')).toBeInTheDocument()
  })
  it('exibe texto Negado para NEGADO', () => {
    render(<VeredittoBadge veredito="NEGADO" />)
    expect(screen.getByText('Negado')).toBeInTheDocument()
  })
})

describe('scoreColor', () => {
  it('retorna classe vermelha para score <= 600', () => {
    expect(scoreColor(0)).toContain('red')
    expect(scoreColor(600)).toContain('red')
  })
  it('retorna classe amarela para score 601-700', () => {
    expect(scoreColor(601)).toContain('yellow')
    expect(scoreColor(700)).toContain('yellow')
  })
  it('retorna classe verde para score >= 701', () => {
    expect(scoreColor(701)).toContain('green')
    expect(scoreColor(1000)).toContain('green')
  })
})

describe('scoreBg', () => {
  it('retorna bg vermelho para score <= 600', () => {
    expect(scoreBg(500)).toContain('red')
  })
  it('retorna bg amarelo para score 601-700', () => {
    expect(scoreBg(650)).toContain('yellow')
  })
  it('retorna bg verde para score >= 701', () => {
    expect(scoreBg(800)).toContain('green')
  })
})
```

- [ ] **Step 2: Rodar testes Badge (esperar falha)**

```bash
cd /Users/samwelltech/CREDIARIO/frontend
npm test
```

Esperado: FAIL — `Cannot find module './Badge'`

- [ ] **Step 3: Implementar Badge.tsx**

Criar `frontend/src/components/Badge.tsx`:
```tsx
import { Veredito } from '../types'

const BADGE_STYLES: Record<Veredito, string> = {
  APROVADO: 'bg-green-100 text-green-800',
  MANUAL:   'bg-yellow-100 text-yellow-800',
  NEGADO:   'bg-red-100 text-red-800',
}

const BADGE_LABELS: Record<Veredito, string> = {
  APROVADO: 'Aprovado',
  MANUAL:   'Análise Manual',
  NEGADO:   'Negado',
}

export function VeredittoBadge({ veredito }: { veredito: Veredito }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${BADGE_STYLES[veredito]}`}
    >
      {BADGE_LABELS[veredito]}
    </span>
  )
}

export function scoreColor(score: number): string {
  if (score <= 600) return 'text-red-600'
  if (score <= 700) return 'text-yellow-600'
  return 'text-green-600'
}

export function scoreBg(score: number): string {
  if (score <= 600) return 'bg-red-50 border-red-200'
  if (score <= 700) return 'bg-yellow-50 border-yellow-200'
  return 'bg-green-50 border-green-200'
}
```

- [ ] **Step 4: Rodar testes Badge (esperar pass)**

```bash
cd /Users/samwelltech/CREDIARIO/frontend
npm test
```

Esperado: PASS — todos os testes de Badge verde.

- [ ] **Step 5: Escrever testes do Modal**

Criar `frontend/src/components/Modal.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('nao renderiza nada quando closed', () => {
    render(<Modal open={false} title="Teste" onClose={() => {}}><p>Conteudo</p></Modal>)
    expect(screen.queryByText('Teste')).not.toBeInTheDocument()
  })

  it('renderiza titulo e children quando open', () => {
    render(<Modal open={true} title="Modal Teste" onClose={() => {}}><p>Conteudo do modal</p></Modal>)
    expect(screen.getByText('Modal Teste')).toBeInTheDocument()
    expect(screen.getByText('Conteudo do modal')).toBeInTheDocument()
  })

  it('chama onClose ao pressionar Escape', () => {
    const onClose = vi.fn()
    render(<Modal open={true} title="Teste" onClose={onClose}><p>x</p></Modal>)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('chama onClose ao clicar no backdrop', () => {
    const onClose = vi.fn()
    render(<Modal open={true} title="Teste" onClose={onClose}><p>x</p></Modal>)
    const backdrop = screen.getByRole('dialog')
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 6: Rodar testes Modal (esperar falha)**

```bash
cd /Users/samwelltech/CREDIARIO/frontend
npm test
```

Esperado: FAIL — `Cannot find module './Modal'`

- [ ] **Step 7: Implementar Modal.tsx**

Criar `frontend/src/components/Modal.tsx`:
```tsx
import { useEffect } from 'react'

type ModalProps = {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Rodar testes Modal (esperar pass)**

```bash
cd /Users/samwelltech/CREDIARIO/frontend
npm test
```

Esperado: PASS — todos os testes verde.

- [ ] **Step 9: Implementar ForcarNovaModal.tsx**

Criar `frontend/src/components/ForcarNovaModal.tsx`:
```tsx
import { useState } from 'react'
import { Modal } from './Modal'

type ForcarNovaModalProps = {
  open: boolean
  onClose: () => void
  onConfirm: (motivo: string) => void
}

export function ForcarNovaModal({ open, onClose, onConfirm }: ForcarNovaModalProps) {
  const [motivo, setMotivo] = useState('')

  function handleConfirm() {
    if (!motivo.trim()) return
    onConfirm(motivo.trim())
    setMotivo('')
  }

  function handleClose() {
    setMotivo('')
    onClose()
  }

  return (
    <Modal open={open} title="Forçar nova consulta" onClose={handleClose}>
      <p className="text-sm text-gray-600 mb-3">
        Uma nova consulta sera cobrada (~R$ 2,34). Informe o motivo:
      </p>
      <textarea
        rows={3}
        placeholder="Ex.: documento atualizado, suspeita de fraude..."
        value={motivo}
        onChange={e => setMotivo(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={handleClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={!motivo.trim()}
          className="px-4 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg
                     hover:bg-orange-700 disabled:opacity-50 transition-colors"
        >
          Confirmar nova consulta
        </button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 10: Implementar Header.tsx**

Criar `frontend/src/components/Header.tsx`:
```tsx
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Header() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-gray-900">
          {profile?.lojas?.nome ?? 'Crediário'}
        </span>
        {profile && (
          <span className="text-gray-400 text-sm">{profile.nome}</span>
        )}
      </div>
      <nav className="flex items-center gap-5">
        <Link
          to="/historico"
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Histórico
        </Link>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Sair
        </button>
      </nav>
    </header>
  )
}
```

- [ ] **Step 11: Rodar todos os testes**

```bash
cd /Users/samwelltech/CREDIARIO/frontend
npm test
```

Esperado: PASS — todos verde.

- [ ] **Step 12: Commit**

```bash
cd /Users/samwelltech/CREDIARIO
git add frontend/src/components/Badge.tsx frontend/src/components/Badge.test.tsx frontend/src/components/Modal.tsx frontend/src/components/Modal.test.tsx frontend/src/components/ForcarNovaModal.tsx frontend/src/components/Header.tsx
git commit -m "feat: componentes Badge, Modal, ForcarNovaModal e Header"
```

---

## Task 7: Página Consulta (useConsulta + Consulta.tsx)

**Files:**
- Create: `frontend/src/hooks/useConsulta.ts`
- Create: `frontend/src/pages/Consulta.tsx`

- [ ] **Step 1: Criar useConsulta.ts**

Criar `frontend/src/hooks/useConsulta.ts`:
```ts
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
    motivoForca?: string
  ) {
    setState({ status: 'loading' })

    const { data, error } = await supabase.functions.invoke('consultar-cpf', {
      body: {
        cpf,
        documento_conferido: documentoConferido,
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

- [ ] **Step 2: Criar Consulta.tsx**

Criar `frontend/src/pages/Consulta.tsx`:
```tsx
import { useState } from 'react'
import { Header } from '../components/Header'
import { Spinner } from '../components/Spinner'
import { VeredittoBadge, scoreColor, scoreBg } from '../components/Badge'
import { ForcarNovaModal } from '../components/ForcarNovaModal'
import { useConsulta } from '../hooks/useConsulta'
import { formatCPF, stripCPF, isValidCPF, formatDate } from '../lib/formatters'
import { ResultadoOk } from '../types'

function ResultadoOkView({
  data,
  onNova,
  onForcarNova,
}: {
  data: ResultadoOk
  onNova: () => void
  onForcarNova: () => void
}) {
  return (
    <div className={`border rounded-xl p-6 space-y-5 ${scoreBg(data.score)}`}>
      {data.cache_hit && (
        <div className="bg-yellow-100 border border-yellow-300 rounded-lg px-4 py-3 text-sm text-yellow-800 flex items-start justify-between gap-3">
          <span>
            Resultado de consulta anterior —{' '}
            {data.cache_data ? formatDate(data.cache_data) : ''} — sem nova cobrança
          </span>
          <button
            onClick={onForcarNova}
            className="shrink-0 text-xs font-medium text-yellow-900 underline"
          >
            Forçar nova consulta
          </button>
        </div>
      )}

      <div className="text-center py-4">
        <p className={`text-8xl font-bold tabular-nums ${scoreColor(data.score)}`}>
          {data.score}
        </p>
        <p className="text-gray-500 text-sm mt-2">Score de crédito (0–1000)</p>
        {data.faixa && (
          <p className="text-gray-500 text-sm mt-1">{data.faixa}</p>
        )}
      </div>

      <div className="flex justify-center">
        <VeredittoBadge veredito={data.veredito} />
      </div>

      <div className="text-center pt-2">
        <button
          onClick={onNova}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          Nova consulta
        </button>
      </div>
    </div>
  )
}

export function Consulta() {
  const [cpfDisplay, setCpfDisplay]           = useState('')
  const [documentoConferido, setDocumento]    = useState(false)
  const [showForcarModal, setShowForcarModal] = useState(false)
  const { state, consultar, reset }           = useConsulta()

  const cpfDigits = stripCPF(cpfDisplay)
  const cpfValido = isValidCPF(cpfDisplay)

  function handleCPFChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCpfDisplay(formatCPF(e.target.value))
  }

  function handleConsultar() {
    if (!cpfValido || !documentoConferido) return
    consultar(cpfDigits, documentoConferido)
  }

  function handleForcarNova(motivo: string) {
    setShowForcarModal(false)
    consultar(cpfDigits, documentoConferido, motivo)
  }

  function handleNova() {
    setCpfDisplay('')
    setDocumento(false)
    reset()
  }

  const isIdle    = state.status === 'idle'
  const isLoading = state.status === 'loading'
  const showForm  = isIdle || isLoading

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-lg mx-auto px-4 py-10 space-y-4">
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Consulta de Crédito</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPF do cliente
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpfDisplay}
                onChange={handleCPFChange}
                maxLength={14}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={documentoConferido}
                onChange={e => setDocumento(e.target.checked)}
                className="mt-0.5 accent-blue-600"
              />
              <span className="text-sm text-gray-700">
                Documento do cliente conferido
              </span>
            </label>

            <button
              onClick={handleConsultar}
              disabled={!cpfValido || !documentoConferido || isLoading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium
                         hover:bg-blue-700 disabled:opacity-50 transition-colors
                         flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><Spinner size="sm" /> Consultando...</>
              ) : (
                'Consultar'
              )}
            </button>
          </div>
        )}

        {state.status === 'resultado' && (() => {
          const { data } = state

          if (data.tipo === 'cpf_nao_encontrado') {
            return (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center space-y-3">
                <div className="text-3xl">🔍</div>
                <h3 className="font-semibold text-blue-900">CPF não localizado</h3>
                <p className="text-sm text-blue-700">Seguir para análise manual.</p>
                <button
                  onClick={handleNova}
                  className="text-sm text-blue-600 underline hover:text-blue-800"
                >
                  Nova consulta
                </button>
              </div>
            )
          }

          if (data.tipo === 'erro_sistema') {
            return (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-8 text-center space-y-3">
                <div className="text-3xl">⚠️</div>
                <h3 className="font-semibold text-orange-900">Consulta indisponível</h3>
                <p className="text-sm text-orange-700">
                  Tente novamente. Se o problema persistir, verifique o saldo da conta.
                </p>
                <details className="text-left text-xs text-orange-500 mt-2">
                  <summary className="cursor-pointer">Detalhes técnicos</summary>
                  <p className="mt-1 font-mono">{data.motivo}</p>
                </details>
                <button
                  onClick={handleNova}
                  className="text-sm text-orange-600 underline hover:text-orange-800"
                >
                  Tentar novamente
                </button>
              </div>
            )
          }

          // data.tipo === 'ok'
          return (
            <ResultadoOkView
              data={data}
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

- [ ] **Step 3: Rodar testes**

```bash
cd /Users/samwelltech/CREDIARIO/frontend
npm test
```

Esperado: PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/samwelltech/CREDIARIO
git add frontend/src/hooks/useConsulta.ts frontend/src/pages/Consulta.tsx
git commit -m "feat: pagina Consulta com todos os estados e cache hit"
```

---

## Task 8: Página Histórico (useHistorico + Historico.tsx)

**Files:**
- Create: `frontend/src/hooks/useHistorico.ts`
- Create: `frontend/src/pages/Historico.tsx`

- [ ] **Step 1: Criar useHistorico.ts**

Criar `frontend/src/hooks/useHistorico.ts`:
```ts
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ConsultaRow, Veredito, TipoResultado } from '../types'

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

    supabase
      .from('consultas')
      .select('*, profiles(nome)')
      .order('criado_em', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) setError(err.message)
        else setRows((data ?? []) as ConsultaRow[])
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

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
  }
}
```

- [ ] **Step 2: Criar Historico.tsx**

Criar `frontend/src/pages/Historico.tsx`:
```tsx
import { Header } from '../components/Header'
import { Spinner } from '../components/Spinner'
import { VeredittoBadge } from '../components/Badge'
import { useHistorico } from '../hooks/useHistorico'
import { formatCPF, formatDate, exportToCSV } from '../lib/formatters'

export function Historico() {
  const {
    rows, rowsFiltrados, loading, error,
    filtros, setFiltros,
    pagina, setPagina, totalPaginas,
    operadores,
  } = useHistorico()

  function handleExportCSV() {
    const csvRows = rowsFiltrados.map(r => ({
      CPF:           formatCPF(r.cpf),
      Score:         r.score ?? '',
      Resultado:     r.veredito ?? (r.tipo_resultado === 'cpf_nao_encontrado' ? 'Nao encontrado' : 'Erro'),
      Operador:      r.profiles?.nome ?? '',
      'Data/Hora':   formatDate(r.criado_em),
      'Doc. Conferido': r.documento_conferido ? 'Sim' : 'Nao',
      'Forcou Nova': r.forcou_nova ? 'Sim' : 'Nao',
      'Motivo Forca': r.motivo_forca ?? '',
    }))
    exportToCSV(csvRows, `historico-credito-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Histórico de Consultas</h2>
          <button
            onClick={handleExportCSV}
            disabled={rowsFiltrados.length === 0}
            className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg
                       hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Exportar CSV
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="CPF"
            value={filtros.cpf}
            onChange={e => setFiltros({ cpf: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filtros.operador}
            onChange={e => setFiltros({ operador: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos operadores</option>
            {operadores.map(op => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
          <select
            value={filtros.veredito}
            onChange={e => setFiltros({ veredito: e.target.value as typeof filtros.veredito })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos resultados</option>
            <option value="APROVADO">Aprovado</option>
            <option value="MANUAL">Análise Manual</option>
            <option value="NEGADO">Negado</option>
            <option value="cpf_nao_encontrado">CPF não encontrado</option>
            <option value="erro_sistema">Erro de sistema</option>
          </select>
          <input
            type="date"
            value={filtros.dataInicio}
            onChange={e => setFiltros({ dataInicio: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={filtros.dataFim}
            onChange={e => setFiltros({ dataFim: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Conteudo */}
        {loading && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}

        {error && (
          <p className="text-red-600 text-sm text-center py-8">{error}</p>
        )}

        {!loading && !error && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['CPF', 'Score', 'Resultado', 'Operador', 'Data/Hora'].map(col => (
                      <th key={col} className="text-left px-4 py-3 font-medium text-gray-600">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-gray-400 py-10">
                        Nenhum registro encontrado
                      </td>
                    </tr>
                  )}
                  {rows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-gray-900">
                        {formatCPF(row.cpf)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.score ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {row.veredito ? (
                          <VeredittoBadge veredito={row.veredito} />
                        ) : row.tipo_resultado === 'cpf_nao_encontrado' ? (
                          <span className="text-blue-600 text-xs font-medium">Não encontrado</span>
                        ) : (
                          <span className="text-orange-600 text-xs font-medium">Erro</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.profiles?.nome ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(row.criado_em)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                             hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-600">
                  {pagina} / {totalPaginas}
                </span>
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                             hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Próximo
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Rodar testes**

```bash
cd /Users/samwelltech/CREDIARIO/frontend
npm test
```

Esperado: PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/samwelltech/CREDIARIO
git add frontend/src/hooks/useHistorico.ts frontend/src/pages/Historico.tsx
git commit -m "feat: pagina Historico com filtros, paginacao e exportacao CSV"
```

---

## Task 9: Roteamento e wiring (App.tsx + main.tsx)

**Files:**
- Create/Modify: `frontend/src/App.tsx`
- Create/Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Criar App.tsx**

Sobrescrever `frontend/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Consulta } from './pages/Consulta'
import { Historico } from './pages/Historico'
import { ProtectedRoute } from './components/ProtectedRoute'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Consulta />
            </ProtectedRoute>
          }
        />
        <Route
          path="/historico"
          element={
            <ProtectedRoute>
              <Historico />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Sobrescrever main.tsx**

Sobrescrever `frontend/src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { AuthProvider } from './contexts/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
)
```

- [ ] **Step 3: Rodar build para checar erros TypeScript**

```bash
cd /Users/samwelltech/CREDIARIO/frontend
npm run build
```

Esperado: build concluido sem erros de tipo. Se houver erros, corrija antes de continuar.

- [ ] **Step 4: Rodar o servidor de desenvolvimento**

```bash
cd /Users/samwelltech/CREDIARIO/frontend
cp .env.example .env
# Editar .env com as variaveis reais antes de continuar
npm run dev
```

Abrir `http://localhost:5173` e verificar:
- Redireciona para `/login` sem sessao
- Login funciona com usuario criado no Supabase
- Pagina principal carrega apos login
- Link Historico navega para `/historico`
- Botao Sair desloga e redireciona para `/login`

- [ ] **Step 5: Rodar todos os testes**

```bash
cd /Users/samwelltech/CREDIARIO/frontend
npm test
```

Esperado: PASS — todos verde.

- [ ] **Step 6: Commit**

```bash
cd /Users/samwelltech/CREDIARIO
git add frontend/src/App.tsx frontend/src/main.tsx
git commit -m "feat: roteamento React Router e wiring do AuthProvider"
```

---

## Task 10: README e .env.example

**Files:**
- Create: `README.md`

- [ ] **Step 1: Criar o primeiro operador no Supabase**

No painel Supabase > Authentication > Users > "Add user", criar o usuario com e-mail e senha.
Depois no SQL Editor, vincular o usuario a uma loja (substitua o UUID pelo id do usuario criado):
```sql
INSERT INTO profiles (id, nome, loja_id)
VALUES (
  '<uuid-do-usuario-em-auth.users>',
  'Nome do Operador',
  (SELECT id FROM lojas WHERE nome = 'Loja 1')
);
```

- [ ] **Step 2: Criar README.md**

Criar `README.md`:
```markdown
# Crediário — Sistema de Análise de Crédito

Sistema web interno para consulta de score de crédito de clientes antes da abertura de crediário. Operadores digitam o CPF e recebem um veredito (Aprovado / Análise Manual / Negado) baseado no score da API FonteData.

## Arquitetura

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS — deploy na Vercel
- **Backend:** Supabase (Postgres + Auth + Edge Functions Deno)
- **API externa:** FonteData (`score-credito-quod`) — ~R$ 2,34/consulta
- **Cache:** consultas bem-sucedidas ficam salvas por 30 dias; novas consultas do mesmo CPF reutilizam o resultado salvo sem cobrar

## Configuração passo a passo

### 1. Criar projeto no Supabase

Acesse [supabase.com](https://supabase.com), crie um projeto e anote:
- **Project URL** — encontrado em Project Settings > API > Project URL
- **anon public key** — encontrado em Project Settings > API > Project API keys > `anon public`

> A chave `anon` é segura para o frontend porque todas as tabelas têm Row Level Security (RLS). Nunca use a chave `service_role` no frontend.

### 2. Clonar e instalar

```bash
git clone <url-do-repositorio>
cd CREDIARIO/frontend
npm install
```

### 3. Configurar variáveis do frontend

```bash
cp .env.example .env
```

Editar `frontend/.env` e preencher:

```
VITE_SUPABASE_URL=https://<seu-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<sua-anon-key>
```

Ambos os valores estão em **Project Settings > API** no painel do Supabase.

### 4. Aplicar as migrations do banco

Vincular ao projeto remoto (use o Project Reference ID, disponível em Project Settings > General):

```bash
cd /caminho/para/CREDIARIO
npx supabase link --project-ref <project-ref>
npx supabase db push
```

### 5. Inserir as lojas

No painel Supabase > SQL Editor:

```sql
INSERT INTO lojas (nome) VALUES
  ('Loja 1'),
  ('Loja 2'),
  ('Loja 3'),
  ('Loja 4');
```

### 6. Configurar o secret da API FonteData

A chave da FonteData fica exclusivamente no servidor — nunca em arquivo do frontend.

```bash
npx supabase secrets set FONTEDATA_API_KEY=sua_chave_fontedata
```

Para verificar:
```bash
npx supabase secrets list
```

A Edge Function lê essa chave via `Deno.env.get('FONTEDATA_API_KEY')`.

### 7. Fazer deploy da Edge Function

```bash
npx supabase functions deploy consultar-cpf
```

### 8. Criar o primeiro operador

No painel Supabase > Authentication > Users > **Add user**, crie o usuário com e-mail e senha.

Copie o UUID do usuário criado e execute no SQL Editor:

```sql
INSERT INTO profiles (id, nome, loja_id)
VALUES (
  '<uuid-copiado>',
  'Nome do Operador',
  (SELECT id FROM lojas WHERE nome = 'Loja 1')
);
```

Repita para cada operador, associando à loja correta.

### 9. Deploy do frontend na Vercel

1. Importe o repositório na Vercel
2. Defina o **Root Directory** como `frontend`
3. Adicione as variáveis de ambiente na Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

## Desenvolvimento local

```bash
cd frontend
cp .env.example .env    # preencher com as credenciais do Supabase
npm run dev             # inicia em http://localhost:5173
npm test                # roda os testes
```

## Janela de cache

Por padrão, consultas bem-sucedidas são reutilizadas por **30 dias**. Para alterar:

```bash
npx supabase secrets set CACHE_DIAS=15
```

## Regra de decisão

| Score          | Veredito       |
|----------------|----------------|
| 0 – 600        | NEGADO         |
| 601 – 700      | ANÁLISE MANUAL |
| 701 – 1000     | APROVADO       |

A decisão é sempre baseada no número, nunca no texto da API.

## Segurança e LGPD

- A `FONTEDATA_API_KEY` existe apenas como secret do servidor Supabase
- A `anon key` do Supabase é segura no frontend (protegida por RLS)
- Cada consulta registra: CPF, score, veredito, operador, loja, data/hora e se o documento foi conferido — trilha de auditoria para fins de LGPD
- Finalidade: exclusivamente análise de crédito para concessão de crediário
```

- [ ] **Step 2: Rodar testes finais**

```bash
cd /Users/samwelltech/CREDIARIO/frontend
npm test
```

Esperado: PASS — todos verde.

- [ ] **Step 3: Build final**

```bash
cd /Users/samwelltech/CREDIARIO/frontend
npm run build
```

Esperado: build sem erros.

- [ ] **Step 4: Commit final**

```bash
cd /Users/samwelltech/CREDIARIO
git add README.md
git commit -m "docs: README com guia de configuracao passo a passo"
```

---

## Self-Review — Cobertura do spec

| Requisito do spec                                       | Task que implementa |
|---------------------------------------------------------|---------------------|
| Login por e-mail/senha, sem signup                      | Task 5              |
| Toda rota exige autenticacao                            | Task 5              |
| Campo CPF + checkbox documento + botao Consultar        | Task 7              |
| Cache: verificar antes de cobrar (30 dias)              | Task 4 (Edge Fn)    |
| Banner de cache hit + botao Forcar                      | Task 7              |
| Modal de forca com motivo obrigatorio                   | Task 6              |
| Chamada a API FonteData com X-API-Key no servidor       | Task 4              |
| Regra de decisao so pelo numero (<=600/601-700/>=701)   | Task 4              |
| Score grande com cor por faixa                          | Task 7              |
| Estado cpf_nao_encontrado (nao e reprovacao)            | Task 7              |
| Estado erro_sistema (nao e reprovacao)                  | Task 7              |
| Gravar log com operador_id, loja_id, doc_conferido      | Task 4              |
| RLS: operador ve so consultas da propria loja           | Task 3              |
| Historico com filtros (CPF, operador, veredito, data)   | Task 8              |
| Exportacao CSV do historico filtrado                    | Task 8              |
| Paginacao do historico                                  | Task 8              |
| FONTEDATA_API_KEY nunca no frontend                     | Task 4 + Task 10    |
| .gitignore cobrindo .env                                | Task 1              |
| README com guia de configuracao passo a passo           | Task 10             |
| .env.example com variaveis comentadas                   | Task 2              |
| Multi-loja: cada operador ve so a propria loja          | Task 3 (RLS) + Task 8|
| forcou_nova e motivo_forca gravados no log              | Task 4              |
