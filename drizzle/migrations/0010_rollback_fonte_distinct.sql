-- ADR-0001 ARQ-03. Corrige rollback_fonte: a Staging guarda o histórico e não
-- tem chave única, então cada coleta acrescenta uma linha para o mesmo local.
-- A versão anterior reinseria TODAS as linhas promovidas até p_snapshot_at, e a
-- partir da segunda coleta de uma fonte isso estourava a unique key do Gold
-- research_locations_unique_key (fonte, lower(nome), coalesce(uf, '')).
-- Agora tomamos a versão MAIS RECENTE de cada local (DISTINCT ON pela mesma
-- chave), que também é a semântica correta de "estado da fonte naquele momento".

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
    s.nome,
    COALESCE(s.canonical_type, s.tipo),
    s.uf, s.municipio,
    s.latitude, s.longitude,
    s.fonte, COALESCE(s.fonte_url, ''), s.cnpj,
    s.raw_payload, s.quality_score, s.quality_flags,
    now(), now(), now()
  FROM (
    SELECT DISTINCT ON (fonte, lower(nome), coalesce(uf, '')) *
    FROM staging_locations
    WHERE fonte = p_fonte
      AND promoted_at IS NOT NULL
      AND promoted_at <= p_snapshot_at
    ORDER BY fonte, lower(nome), coalesce(uf, ''), promoted_at DESC, created_at DESC
  ) s;

  GET DIAGNOSTICS v_restored = ROW_COUNT;
  RETURN v_restored;
END;
$$;

REVOKE ALL ON FUNCTION public.rollback_fonte FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollback_fonte TO service_role;

COMMENT ON FUNCTION public.rollback_fonte IS
  'ADR-0001 ARQ-03. Restaura research_locations (Gold) para o estado de uma fonte em um momento anterior, a partir do histórico de staging_locations. Toma a versão mais recente de cada local (DISTINCT ON pela chave do Gold) até p_snapshot_at, evitando chave duplicada. DELETE e INSERT dentro da mesma transação.';
