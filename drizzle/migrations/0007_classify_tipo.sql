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