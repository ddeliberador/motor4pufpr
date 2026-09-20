-- Camada Staging do ADR-0001 em supabase/migrations/
--
-- Por que esta migration existe
-- -----------------------------
-- A camada Staging (tabela staging_locations, funções promote_staging_to_gold,
-- rollback_fonte, classify_tipo e o gatilho trg_staging_qualify) foi aplicada na
-- produção em 17/09/2026 por um trilho separado — drizzle/migrations/, executado
-- com a variável LOVABLE_DB_MIGRATION_URL. Nada disso chegou a supabase/migrations/.
--
-- Consequência prática: um clone limpo do repositório seguido de `supabase db push`
-- produz um banco SEM a camada Staging. O ambiente de produção não é reproduzível a
-- partir do que está versionado. Esta migration fecha essa lacuna espelhando o estado
-- real do banco.
--
-- Tudo aqui é idempotente (CREATE ... IF NOT EXISTS, CREATE OR REPLACE,
-- DROP POLICY IF EXISTS). Aplicar sobre a produção, que já tem os objetos, é no-op.
--
-- Equivalência com o trilho drizzle:
--   drizzle/migrations/0004_create_staging_locations.sql
--   drizzle/migrations/0006_rollback_fonte.sql
--   drizzle/migrations/0007_classify_tipo.sql
--   drizzle/migrations/0008_staging_quality_and_canonical_triggers.sql
--   drizzle/migrations/0009_promote_threshold_default_55.sql  (substitui a 0005)
-- As migrations 0000–0003 são duplicatas reaplicadas em 0004–0007 e não foram
-- espelhadas.
--
-- DEPENDÊNCIA NÃO VERSIONADA — ver corpo do PR
--   O gatilho abaixo chama public.calc_quality_score(...), que existe na produção
--   (aparece em src/integrations/supabase/types.ts, gerado a partir do banco) mas
--   não está definida em NENHUMA migration deste repositório. Esta migration não
--   pode criá-la sem inventar a regra de pontuação. O bloco final avisa quando ela
--   está ausente.

-- ---------------------------------------------------------------- tabela

CREATE TABLE IF NOT EXISTS public.staging_locations (
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

-- O anon nunca deve alcançar a Staging. O privilégio default do Supabase para
-- tabelas novas em public dá SELECT ao anon, então a negativa é explícita.
REVOKE ALL  ON public.staging_locations FROM anon;
GRANT SELECT ON public.staging_locations TO authenticated;
GRANT ALL    ON public.staging_locations TO service_role;

ALTER TABLE public.staging_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staging_admin_all" ON public.staging_locations;
CREATE POLICY "staging_admin_all"
  ON public.staging_locations FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "staging_auth_select" ON public.staging_locations;
CREATE POLICY "staging_auth_select"
  ON public.staging_locations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_staging_fonte         ON public.staging_locations(fonte);
CREATE INDEX IF NOT EXISTS idx_staging_promoted_at   ON public.staging_locations(promoted_at);
CREATE INDEX IF NOT EXISTS idx_staging_canonical_key ON public.staging_locations(canonical_key);
CREATE INDEX IF NOT EXISTS idx_staging_quality_score ON public.staging_locations(quality_score);

COMMENT ON TABLE public.staging_locations IS
  'Camada Staging do ADR-0001. Recebe dado bruto das APIs, calcula quality_score e canonical_type. Promove para research_locations (Gold) via promote_staging_to_gold(), cujo limiar padrão é 55 desde drizzle/migrations/0009. anon não tem privilégio nesta tabela.';

-- ---------------------------------------------------- classify_tipo

CREATE OR REPLACE FUNCTION public.classify_tipo(
  p_nome        text,
  p_tipo_raw    text,
  p_raw_payload jsonb DEFAULT '{}'
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(COALESCE(p_tipo_raw,'')) LIKE '%startup%'
      THEN 'Startup'
    WHEN lower(COALESCE(p_nome,'')) ~ '(universidade|university|unicamp|unesp|ufrj|ufmg|ufpr|ufsc|usp|puc|fgv)'
      OR lower(COALESCE(p_tipo_raw,'')) ~ '(universidade|university)'
      THEN 'Universidade'
    WHEN lower(COALESCE(p_nome,'')) LIKE '%instituto federal%'
      OR lower(COALESCE(p_tipo_raw,'')) LIKE '%instituto federal%'
      THEN 'Instituto Federal'
    WHEN lower(COALESCE(p_tipo_raw,'')) LIKE '%embrapii%'
      THEN 'Unidade Embrapii'
    WHEN lower(COALESCE(p_tipo_raw,'')) LIKE '%supercomput%'
      THEN 'Centro de Supercomputação'
    WHEN lower(COALESCE(p_tipo_raw,'')) LIKE '%incubadora%'
      THEN 'Incubadora'
    WHEN lower(COALESCE(p_tipo_raw,'')) LIKE '%parque tecnol%'
      THEN 'Parque tecnológico'
    WHEN lower(COALESCE(p_tipo_raw,'')) LIKE '%hub%'
      THEN 'Hub de inovação'
    WHEN lower(COALESCE(p_nome,'')) ~ '(instituto|embrapa|fiocruz|inpe|inpa|lncc|lna)'
      OR lower(COALESCE(p_tipo_raw,'')) LIKE '%instituto%'
      THEN 'Instituto de Pesquisa'
    WHEN lower(COALESCE(p_tipo_raw,'')) LIKE '%laborat%'
      OR lower(COALESCE(p_nome,'')) LIKE '%laborat%'
      THEN 'Laboratório de Inovação'
    WHEN lower(COALESCE(p_tipo_raw,'')) LIKE '%ict%'
      OR lower(COALESCE(p_tipo_raw,'')) LIKE '%institui%'
      THEN 'ICT'
    ELSE COALESCE(p_tipo_raw, 'ICT')
  END;
$$;

COMMENT ON FUNCTION public.classify_tipo IS
  'ADR-0001 ARQ-05. Replica a lógica de classificação de tipo de src/components/mapa/dataLake.ts no banco. Alimenta staging_locations.canonical_type durante a ingestão.';
-- ---------------------------------------------- promote_staging_to_gold
-- Limiar padrão 55 (drizzle/migrations/0009). Justificativa registrada lá:
-- fontes sem CNPJ/endereço (OpenAlex, startups) têm teto prático de ~55-65;
-- distribuição no Gold: 5.869 registros em 50-69 contra 20 em 70+.

CREATE OR REPLACE FUNCTION public.promote_staging_to_gold(
  p_fonte        text    DEFAULT NULL,
  p_min_score    integer DEFAULT 55,
  p_promoted_by  text    DEFAULT 'auto'
)
RETURNS TABLE(promoted integer, skipped integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promoted integer := 0;
  v_skipped  integer := 0;
  v_row      staging_locations%ROWTYPE;
BEGIN
  FOR v_row IN
    SELECT * FROM staging_locations
    WHERE (p_fonte IS NULL OR fonte = p_fonte)
      AND quality_score >= p_min_score
      AND promoted_at IS NULL
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO research_locations (
      nome, tipo, uf, municipio,
      latitude, longitude,
      fonte, fonte_url, cnpj,
      raw_metadata, quality_score, quality_flags,
      enriched_at, enrichment_source,
      data_coleta, created_at, updated_at
    ) VALUES (
      v_row.nome,
      COALESCE(v_row.canonical_type, v_row.tipo),
      v_row.uf,
      v_row.municipio,
      v_row.latitude,
      v_row.longitude,
      v_row.fonte,
      COALESCE(v_row.fonte_url, ''),
      v_row.cnpj,
      v_row.raw_payload,
      v_row.quality_score,
      v_row.quality_flags,
      now(),
      'staging_promotion_' || p_promoted_by,
      now(),
      now(),
      now()
    )
    ON CONFLICT (fonte, lower(nome), coalesce(uf, '')) DO UPDATE SET
      tipo              = EXCLUDED.tipo,
      quality_score     = EXCLUDED.quality_score,
      quality_flags     = EXCLUDED.quality_flags,
      enrichment_source = EXCLUDED.enrichment_source,
      updated_at        = now();

    UPDATE staging_locations
    SET
      promoted_at = now(),
      promoted_by = p_promoted_by,
      updated_at  = now()
    WHERE id = v_row.id;

    v_promoted := v_promoted + 1;
  END LOOP;

  SELECT COUNT(*) INTO v_skipped
  FROM staging_locations
  WHERE (p_fonte IS NULL OR fonte = p_fonte)
    AND quality_score < p_min_score
    AND promoted_at IS NULL;

  RETURN QUERY SELECT v_promoted, v_skipped;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_staging_to_gold FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_staging_to_gold TO service_role;

COMMENT ON FUNCTION public.promote_staging_to_gold IS
  'ADR-0001 ARQ-02. Promove staging_locations → research_locations em transação única. Limiar padrão 55 (revisado de 70: teto realista de fontes sem CNPJ/endereço). Idempotente: segunda chamada retorna promoted=0.';
-- ------------------------------------------------------ rollback_fonte

CREATE OR REPLACE FUNCTION public.rollback_fonte(
  p_fonte       text,
  p_snapshot_at timestamptz DEFAULT now() - interval '1 day'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restored integer := 0;
BEGIN
  DELETE FROM research_locations WHERE fonte = p_fonte;

  INSERT INTO research_locations (
    nome, tipo, uf, municipio,
    latitude, longitude,
    fonte, fonte_url, cnpj,
    raw_metadata, quality_score, quality_flags,
    data_coleta, created_at, updated_at
  )
  SELECT
    nome,
    COALESCE(canonical_type, tipo),
    uf, municipio,
    latitude, longitude,
    fonte, COALESCE(fonte_url, ''), cnpj,
    raw_payload, quality_score, quality_flags,
    now(), now(), now()
  FROM staging_locations
  WHERE fonte = p_fonte
    AND promoted_at IS NOT NULL
    AND promoted_at <= p_snapshot_at;

  GET DIAGNOSTICS v_restored = ROW_COUNT;
  RETURN v_restored;
END;
$$;

REVOKE ALL ON FUNCTION public.rollback_fonte FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollback_fonte TO service_role;

COMMENT ON FUNCTION public.rollback_fonte IS
  'ADR-0001 ARQ-03. Restaura research_locations (Gold) para o estado de uma fonte em um momento anterior, a partir do histórico de staging_locations. DELETE e INSERT dentro da mesma transação.';
-- --------------------------------------- gatilho de qualidade (Staging)

-- Gatilho de qualidade + classificação canônica na camada Staging (ADR-0001)
-- staging_locations usa raw_payload (não raw_metadata), então precisa de função própria.

CREATE OR REPLACE FUNCTION public.trg_staging_qualify()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- 1. Score de qualidade (mesma régua do Gold, lendo raw_payload)
  NEW.quality_score := calc_quality_score(
    NEW.latitude, NEW.longitude, NEW.cnpj, NEW.fonte_url,
    NEW.nome, NEW.municipio, NEW.raw_payload
  );

  NEW.quality_flags := jsonb_build_object(
    'sem_lat',      (NEW.latitude IS NULL),
    'sem_cnpj',     (NEW.cnpj IS NULL OR length(regexp_replace(COALESCE(NEW.cnpj,''), '\D','','g')) <> 14),
    'sem_url',      (NEW.fonte_url IS NULL OR NEW.fonte_url NOT LIKE 'http%'),
    'sem_endereco', NOT (NEW.raw_payload ? 'endereco' OR NEW.raw_payload ? 'address' OR NEW.raw_payload ? 'logradouro'),
    'coord_centroide', (
      NEW.latitude IS NOT NULL AND
      (NEW.latitude * 1000) = ROUND(NEW.latitude * 1000) AND
      ABS(NEW.latitude - ROUND(NEW.latitude, 1)) < 0.01
    ),
    'tipo_composto', (length(COALESCE(NEW.tipo,'')) > 50)
  );

  -- 2. Tipo canônico via classify_tipo (mesma lógica do dataLake.ts)
  NEW.canonical_type := classify_tipo(NEW.nome, NEW.tipo, NEW.raw_payload);

  -- 3. Chave canônica de deduplicação (fonte + nome normalizado + uf)
  NEW.canonical_key := lower(NEW.fonte) || '|' || lower(trim(NEW.nome)) || '|' || lower(COALESCE(NEW.uf, ''));

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staging_qualify ON public.staging_locations;
CREATE TRIGGER trg_staging_qualify
  BEFORE INSERT OR UPDATE ON public.staging_locations
  FOR EACH ROW EXECUTE FUNCTION public.trg_staging_qualify();

COMMENT ON FUNCTION public.trg_staging_qualify IS
  'ADR-0001. Calcula quality_score/quality_flags, canonical_type (classify_tipo) e canonical_key em toda escrita na Staging. Score nunca depende do conector.';
-- ------------------------------------------------ dependência não versionada

DO $$
BEGIN
  IF to_regprocedure('public.calc_quality_score(text,text,numeric,numeric,jsonb,text,text)') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calc_quality_score'
                       AND pronamespace = 'public'::regnamespace) THEN
    RAISE WARNING
      'public.calc_quality_score() não existe neste banco. O gatilho trg_staging_qualify vai falhar no primeiro INSERT em staging_locations. A função existe na produção mas não está definida em nenhuma migration do repositório — precisa ser exportada com pg_get_functiondef() e versionada.';
  END IF;
END
$$;
