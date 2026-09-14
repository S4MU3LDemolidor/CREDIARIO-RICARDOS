ALTER TABLE consultas
  ADD COLUMN IF NOT EXISTS apis_utilizadas text[],
  ADD COLUMN IF NOT EXISTS dados_extras    jsonb;
