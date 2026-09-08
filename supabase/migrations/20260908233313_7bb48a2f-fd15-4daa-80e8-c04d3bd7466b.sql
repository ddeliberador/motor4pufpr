CREATE TABLE public.regional_institutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uf text,
  nome text NOT NULL,
  descricao text,
  url text,
  tipo text NOT NULL DEFAULT 'outro',
  ultima_revisao date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT regional_institutes_tipo_check CHECK (tipo IN ('federação industrial','instituto de pesquisa','observatório','plano estadual','outro')),
  CONSTRAINT regional_institutes_uf_check CHECK (uf IS NULL OR uf ~ '^[A-Z]{2}$')
);

GRANT SELECT ON public.regional_institutes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regional_institutes TO authenticated;
GRANT ALL ON public.regional_institutes TO service_role;

ALTER TABLE public.regional_institutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_regional_institutes" ON public.regional_institutes
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "auth_insert_regional_institutes" ON public.regional_institutes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_regional_institutes" ON public.regional_institutes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_regional_institutes" ON public.regional_institutes
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_regional_institutes_updated_at
  BEFORE UPDATE ON public.regional_institutes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_regional_institutes_uf ON public.regional_institutes (uf);

INSERT INTO public.regional_institutes (uf, nome, descricao, url, tipo, ultima_revisao) VALUES
('PR', 'FIEP — Federação das Indústrias do Paraná', 'Federação que representa a indústria paranaense e concentra dados setoriais, serviços de inovação (SENAI/IEL) e estudos sobre a estrutura produtiva do estado.', 'https://www.fiepr.org.br', 'federação industrial', CURRENT_DATE),
('PR', 'LACTEC — Instituto de Tecnologia para o Desenvolvimento', 'Instituto de pesquisa e desenvolvimento tecnológico sediado em Curitiba, atuando em energia, materiais, meio ambiente e ensaios laboratoriais para empresas e governo.', 'https://www.lactec.org.br', 'instituto de pesquisa', CURRENT_DATE),
('PR', 'Secretaria da Inovação e Inteligência Artificial do Paraná', 'Órgão estadual responsável pela política de inovação e IA no Paraná. Provável responsável pelo Plano Paranaense de Inovação.', 'https://www.inovacao.pr.gov.br', 'plano estadual', CURRENT_DATE),
('CE', 'Atlas da Indústria / Observatório da Indústria do Ceará', 'Observatório mantido pela FIEC que publica indicadores, atlas e estudos sobre a indústria e a inovação no Ceará.', 'https://observatorio.fiec.org.br', 'observatório', CURRENT_DATE),
(NULL, 'CNI — Perfil da Indústria Brasileira', 'Painel nacional da Confederação Nacional da Indústria com indicadores gerais da indústria brasileira.', 'https://www.portaldaindustria.com.br/estatisticas/perfil-da-industria/', 'observatório', CURRENT_DATE),
(NULL, 'CNI — Perfil Setorial da Indústria', 'Painel nacional da CNI com indicadores da indústria desagregados por setor de atividade.', 'https://www.portaldaindustria.com.br/estatisticas/perfil-setorial-da-industria/', 'observatório', CURRENT_DATE);