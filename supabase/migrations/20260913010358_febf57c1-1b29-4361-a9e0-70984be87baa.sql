CREATE TABLE public.telemetry_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_ts timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.telemetry_events TO anon, authenticated;
GRANT SELECT ON public.telemetry_events TO authenticated;
GRANT ALL ON public.telemetry_events TO service_role;

ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY anyone_insert_telemetry ON public.telemetry_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    event_type IN ('pillar_view','persona_selected','result_opened','export_action','microfeedback_submitted')
    AND length(session_id) <= 64
  );

CREATE POLICY admin_read_telemetry ON public.telemetry_events
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.sanitize_telemetry_payload()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  cleaned jsonb := '{}'::jsonb;
  k text;
  v jsonb;
BEGIN
  IF NEW.payload IS NULL OR jsonb_typeof(NEW.payload) <> 'object' THEN
    NEW.payload := '{}'::jsonb;
    RETURN NEW;
  END IF;
  FOR k, v IN SELECT key, value FROM jsonb_each(NEW.payload) LOOP
    IF jsonb_typeof(v) = 'string' AND length(v #>> '{}') > 40 THEN
      CONTINUE;
    END IF;
    IF jsonb_typeof(v) IN ('object','array') THEN
      CONTINUE;
    END IF;
    cleaned := cleaned || jsonb_build_object(k, v);
  END LOOP;
  NEW.payload := cleaned;
  NEW.received_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sanitize_telemetry_payload
  BEFORE INSERT ON public.telemetry_events
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_telemetry_payload();

CREATE INDEX idx_telemetry_events_type_time ON public.telemetry_events (event_type, received_at DESC);