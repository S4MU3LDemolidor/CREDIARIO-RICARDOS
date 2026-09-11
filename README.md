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
| 0 – 600        | Negado         |
| 601 – 700      | Análise Manual |
| 701 – 1000     | Aprovado       |

## Estrutura do projeto

```
CREDIARIO/
├── supabase/
│   ├── migrations/
│   │   └── 20260911000001_initial_schema.sql
│   └── functions/
│       └── consultar-cpf/
│           ├── index.ts
│           └── index.test.ts
└── frontend/
    ├── src/
    │   ├── components/  (Badge, Header, Modal, Spinner, ForcarNovaModal, ProtectedRoute)
    │   ├── contexts/    (AuthContext)
    │   ├── hooks/       (useConsulta, useHistorico)
    │   ├── lib/         (formatters, supabaseClient)
    │   ├── pages/       (Login, Consulta, Historico)
    │   └── types/       (index.ts)
    └── .env.example
```
