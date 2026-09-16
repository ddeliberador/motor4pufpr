CREATE TABLE public.ingest_jobs (
  id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'idle',
  paused boolean NOT NULL DEFAULT false,
  pause_reason text,
  lock_until timestamptz,
  last_started_at timestamptz,
  last_finished_at timestamptz,
  consecutive_failures integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ingest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL,
  fonte text NOT NULL,
  ok boolean NOT NULL,
  found integer NOT NULL DEFAULT 0,
  inserted integer NOT NULL DEFAULT 0,
  error text,
  duration_ms integer,
  started_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingest_runs_created_at ON public.ingest_runs (created_at DESC);
CREATE INDEX idx_ingest_runs_fonte ON public.ingest_runs (fonte);

GRANT SELECT ON public.ingest_jobs TO authenticated;
GRANT ALL ON public.ingest_jobs TO service_role;
GRANT SELECT ON public.ingest_runs TO authenticated;
GRANT ALL ON public.ingest_runs TO service_role;

ALTER TABLE public.ingest_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingest_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingest_jobs_select_admin" ON public.ingest_jobs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "ingest_runs_select_admin" ON public.ingest_runs FOR SELECT TO authenticated USING (public.is_admin());

CREATE TRIGGER update_ingest_jobs_updated_at BEFORE UPDATE ON public.ingest_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ingest_jobs (id) VALUES ('locations_daily');