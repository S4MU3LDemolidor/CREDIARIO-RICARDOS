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
