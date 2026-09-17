-- ADR-0001 — Issue QLD-01
-- Normaliza variações de casing do tipo EMBRAPII
-- 'Unidade EMBRAPII' (96 registros) → 'Unidade Embrapii' (padrão)
-- Independente do ADR-0001 — pode ser aplicado a qualquer momento
--
-- Diagnóstico antes de aplicar:
--   SELECT tipo, COUNT(*) FROM research_locations
--   WHERE tipo ILIKE '%embrapii%' GROUP BY tipo;
--
-- Verificação após aplicar:
--   SELECT COUNT(*) FROM research_locations WHERE tipo = 'Unidade EMBRAPII';
--   -- deve retornar 0

UPDATE research_locations
SET
  type       = 'Unidade Embrapii',
  updated_at = now()
WHERE tipo = 'Unidade EMBRAPII';
