-- Issue #11: telemetry_events aceita INSERT do papel anon (necessário para
-- telemetria sem login) sem nenhum limite de volume. Quando TELEMETRY_ENABLED
-- virar true no frontend, um script com a chave anon pública poderia inserir
-- milhões de linhas. Este trigger recusa o INSERT quando a sessão passa de
-- 30 eventos em 60 s e, como proteção contra rotação de session_id, quando o
-- total de eventos em 60 s passa de 3000 (qualquer origem).
--
-- SECURITY DEFINER porque anon não tem SELECT na tabela e o trigger precisa
-- contar as linhas recentes.

CREATE INDEX IF NOT EXISTS idx_telemetry_events_session_time
  ON public.telemetry_events (session_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_received_at
  ON public.telemetry_events (received_at DESC);

CREATE OR REPLACE FUNCTION public.limit_telemetry_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  limite_sessao constant integer := 30;
  limite_global constant integer := 3000;
  janela constant interval := interval '60 seconds';
  na_sessao integer;
  no_total integer;
BEGIN
  SELECT count(*) INTO na_sessao
  FROM public.telemetry_events
  WHERE session_id = NEW.session_id
    AND received_at > now() - janela;

  IF na_sessao >= limite_sessao THEN
    RAISE EXCEPTION 'telemetria: limite de % eventos por sessão em % excedido', limite_sessao, janela
      USING ERRCODE = 'P0001', HINT = 'telemetry_rate_limit';
  END IF;

  SELECT count(*) INTO no_total
  FROM public.telemetry_events
  WHERE received_at > now() - janela;

  IF no_total >= limite_global THEN
    RAISE EXCEPTION 'telemetria: limite global de % eventos em % excedido', limite_global, janela
      USING ERRCODE = 'P0001', HINT = 'telemetry_rate_limit';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.limit_telemetry_rate() FROM public, anon, authenticated;

CREATE TRIGGER trg_limit_telemetry_rate
  BEFORE INSERT ON public.telemetry_events
  FOR EACH ROW EXECUTE FUNCTION public.limit_telemetry_rate();
