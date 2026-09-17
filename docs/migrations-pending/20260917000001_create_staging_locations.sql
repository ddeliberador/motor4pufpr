-- ADR-0001 — Issue ARQ-01
-- Cria tabela staging_locations (camada Staging)
-- anon não tem acesso; authenticated tem SELECT; is_admin() tem acesso total
--
-- Como aplicar:
--   supabase db push
--   ou painel Supabase → SQL Editor → copiar e executar
--
-- Verificação após aplicar:
--   SELECT has_table_privilege('anon', 'staging_locations', 'SELECT');
--   -- deve retornar false

CREATE TABLE IF NOT EXISTS staging_locations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                 text NOT NULL,
  tipo                 text NOT NULL,
  uf                   text,
  municipio            text,
  latitude             numeric,
  longitude            numeric,
  fonte                text NOT NULL,
  fonte_url            text,
  cnpj                 text,
  raw_payload          jsonb NOT NULL DEFAULT '{}',
  quality_score        integer DEFAULT 0,
  quality_flags        jsonb DEFAULT '{}',
  quality_rule_version text DEFAULT 'v1.0',
  canonical_key        text,
  canonical_type       text,
  promoted_at          timestamptz,
  promoted_by          text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE staging_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staging_admin_all"
  ON staging_locations FOR ALL
  USING (public.is_admin());

CREATE POLICY "staging_auth_select"
  ON staging_locations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_staging_fonte         ON staging_locations(fonte);
CREATE INDEX IF NOT EXISTS idx_staging_promoted_at   ON staging_locations(promoted_at);
CREATE INDEX IF NOT EXISTS idx_staging_canonical_key ON staging_locations(canonical_key);
CREATE INDEX IF NOT EXISTS idx_staging_quality_score ON staging_locations(quality_score);

COMMENT ON TABLE staging_locations IS
  'Camada Staging do ADR-0001. Recebe dado bruto das APIs, calcula quality_score e canonical_type. Promove para research_locations (Gold) via promote_staging_to_gold() quando score >= 70. anon nunca tem acesso.';
