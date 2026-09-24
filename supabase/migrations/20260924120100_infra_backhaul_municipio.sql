-- Cópia local do backhaul por município (ANATEL) para a Layer 2c do Mapa.
--
-- Até aqui, cada vez que alguém ligava a camada, a edge function
-- map-infrastructure baixava o ZIP "Mapeamento da Rede de Transporte" da
-- ANATEL (timeout de 60 s) e o CSV de coordenadas municipais, descompactava e
-- cruzava tudo em memória — sem cache. O dado é anual: a mesma resposta era
-- reconstruída do zero a cada clique, e a camada caía junto com o site da
-- ANATEL.
--
-- A função passa a ler desta tabela e só vai à ANATEL quando a cópia tem mais
-- de 30 dias (ou não existe). Se a ANATEL falhar nessa hora, a camada segue
-- com a cópia anterior e a resposta diz que ela está desatualizada.
--
-- Acesso: só service_role (a edge function). O navegador nunca lê a tabela
-- direto, então anon e authenticated não recebem nada — a revogação é
-- explícita porque o privilégio default do Supabase para tabelas novas em
-- public concede tudo a esses papéis.

CREATE TABLE IF NOT EXISTS public.infra_backhaul_municipio (
  codigo_ibge  text PRIMARY KEY CHECK (codigo_ibge ~ '^\d{7}$'),
  municipio    text NOT NULL,
  uf           text NOT NULL,
  latitude     double precision NOT NULL,
  longitude    double precision NOT NULL,
  tem_backhaul boolean NOT NULL,
  tipo         text NOT NULL,
  ano          text NOT NULL,
  fonte        text NOT NULL,
  coletado_em  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.infra_backhaul_municipio ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.infra_backhaul_municipio FROM anon, authenticated;
GRANT ALL ON public.infra_backhaul_municipio TO service_role;

COMMENT ON TABLE public.infra_backhaul_municipio IS
  'Layer 2c do Mapa: backhaul por município (ANATEL, Mapeamento da Rede de Transporte) cruzado com coordenadas municipais pelo código IBGE. Escrita e leitura só pela edge function map-infrastructure (service_role); renovada quando a cópia passa de 30 dias.';

-- Verificação (SQL Editor, depois de aplicar):
--   SELECT relrowsecurity FROM pg_class WHERE oid = 'public.infra_backhaul_municipio'::regclass;  -- true
--   SELECT grantee, privilege_type FROM information_schema.role_table_grants
--    WHERE table_name = 'infra_backhaul_municipio' AND grantee IN ('anon','authenticated');     -- 0 linhas
-- Depois de ligar a camada uma vez no /mapa:
--   SELECT count(*), min(coletado_em), max(ano) FROM public.infra_backhaul_municipio;           -- ~5.570
