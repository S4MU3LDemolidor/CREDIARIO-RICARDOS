ALTER TABLE consultas
  ADD COLUMN IF NOT EXISTS capacidade_pagamento text,
  ADD COLUMN IF NOT EXISTS perfil_credito       text;
