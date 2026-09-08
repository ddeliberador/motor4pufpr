-- 1) Papéis de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- Mantém o acesso atual do mantenedor: contas já existentes viram admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) community_feedback: troca USING (true) por is_admin()
DROP POLICY IF EXISTS admin_read_feedback ON public.community_feedback;
DROP POLICY IF EXISTS admin_update_feedback ON public.community_feedback;
DROP POLICY IF EXISTS admin_delete_feedback ON public.community_feedback;

CREATE POLICY admin_read_feedback ON public.community_feedback
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY admin_update_feedback ON public.community_feedback
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY admin_delete_feedback ON public.community_feedback
  FOR DELETE TO authenticated USING (public.is_admin());

-- 3) Rate limit por IP para funções de IA
CREATE TABLE public.ai_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  fn text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.ai_rate_limits TO service_role;

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_manage_rate_limits ON public.ai_rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_ai_rate_limits_lookup ON public.ai_rate_limits (ip, fn, created_at DESC);

-- 4) Integridade de search_snapshots
UPDATE public.search_snapshots SET tema_original = left(tema_original, 120)
  WHERE tema_original IS NOT NULL AND length(tema_original) > 120;
UPDATE public.search_snapshots SET uf = NULL
  WHERE uf IS NOT NULL AND uf NOT IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO');
UPDATE public.search_snapshots SET municipio_ibge = NULL
  WHERE municipio_ibge IS NOT NULL AND municipio_ibge !~ '^\d{7}$';
UPDATE public.search_snapshots SET tema_normalizado = left(tema_normalizado, 120)
  WHERE length(tema_normalizado) > 120;

ALTER TABLE public.search_snapshots
  ADD CONSTRAINT search_snapshots_uf_valida CHECK (
    uf IS NULL OR uf IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')
  ),
  ADD CONSTRAINT search_snapshots_municipio_ibge_valido CHECK (
    municipio_ibge IS NULL OR municipio_ibge ~ '^\d{7}$'
  ),
  ADD CONSTRAINT search_snapshots_tema_original_tamanho CHECK (
    tema_original IS NULL OR length(tema_original) <= 120
  ),
  ADD CONSTRAINT search_snapshots_tema_normalizado_tamanho CHECK (
    length(tema_normalizado) BETWEEN 1 AND 120
  );