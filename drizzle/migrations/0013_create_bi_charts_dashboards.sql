-- Gráficos salvos (receita de consulta)
CREATE TABLE public.custom_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  dataset_key text NOT NULL,
  chart_type text NOT NULL DEFAULT 'bar_vertical',
  x_column text NOT NULL,
  metric_agg text NOT NULL DEFAULT 'count',
  metric_column text,
  filters jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order text NOT NULL DEFAULT 'desc',
  row_limit integer NOT NULL DEFAULT 30,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.custom_charts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_charts TO authenticated;
GRANT ALL ON public.custom_charts TO service_role;

ALTER TABLE public.custom_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY charts_public_read ON public.custom_charts
  FOR SELECT TO anon USING (is_public = true);
CREATE POLICY charts_auth_read ON public.custom_charts
  FOR SELECT TO authenticated USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY charts_owner_insert ON public.custom_charts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY charts_owner_update ON public.custom_charts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY charts_owner_delete ON public.custom_charts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Dashboards
CREATE TABLE public.custom_dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.custom_dashboards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_dashboards TO authenticated;
GRANT ALL ON public.custom_dashboards TO service_role;

ALTER TABLE public.custom_dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY dash_public_read ON public.custom_dashboards
  FOR SELECT TO anon USING (is_public = true);
CREATE POLICY dash_auth_read ON public.custom_dashboards
  FOR SELECT TO authenticated USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY dash_owner_insert ON public.custom_dashboards
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY dash_owner_update ON public.custom_dashboards
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY dash_owner_delete ON public.custom_dashboards
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Itens do dashboard
CREATE TABLE public.dashboard_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dashboard_id uuid NOT NULL REFERENCES public.custom_dashboards(id) ON DELETE CASCADE,
  chart_id uuid NOT NULL REFERENCES public.custom_charts(id) ON DELETE CASCADE,
  largura text NOT NULL DEFAULT 'half',
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX dashboard_items_dashboard_idx ON public.dashboard_items(dashboard_id, ordem);

GRANT SELECT ON public.dashboard_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_items TO authenticated;
GRANT ALL ON public.dashboard_items TO service_role;

ALTER TABLE public.dashboard_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY items_public_read ON public.dashboard_items
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.custom_dashboards d WHERE d.id = dashboard_id AND d.is_public = true)
  );
CREATE POLICY items_auth_read ON public.dashboard_items
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.custom_dashboards d WHERE d.id = dashboard_id AND d.is_public = true)
  );
CREATE POLICY items_owner_insert ON public.dashboard_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY items_owner_update ON public.dashboard_items
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY items_owner_delete ON public.dashboard_items
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER custom_charts_updated_at BEFORE UPDATE ON public.custom_charts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER custom_dashboards_updated_at BEFORE UPDATE ON public.custom_dashboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();