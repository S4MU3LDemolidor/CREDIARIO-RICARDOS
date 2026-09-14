-- Indice composto para query de cache: cpf + tipo_resultado + criado_em DESC
-- Elimina sort separado e filtro de tipo_resultado na busca de cache
CREATE INDEX IF NOT EXISTS idx_consultas_cache
  ON consultas(cpf, tipo_resultado, criado_em DESC);
