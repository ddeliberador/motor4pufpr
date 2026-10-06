CREATE TABLE public.indicadores_uf (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uf char(2) NOT NULL,
  indicador text NOT NULL,
  ano int NOT NULL,
  valor numeric NOT NULL,
  unidade text,
  fonte text NOT NULL,
  fonte_url text,
  metodo text,
  coletado_em timestamptz DEFAULT now(),
  UNIQUE (uf, indicador, ano)
);
GRANT SELECT ON public.indicadores_uf TO anon, authenticated;
GRANT ALL ON public.indicadores_uf TO service_role;
ALTER TABLE public.indicadores_uf ENABLE ROW LEVEL SECURITY;
CREATE POLICY "indicadores_uf leitura publica" ON public.indicadores_uf FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.capacidade_pesos (
  indicador text PRIMARY KEY,
  rotulo text NOT NULL,
  bloco text NOT NULL,
  peso_bloco numeric NOT NULL,
  peso numeric NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  origem text NOT NULL CHECK (origem IN ('research_locations','indicadores_uf')),
  justificativa text,
  versao int DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.capacidade_pesos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.capacidade_pesos TO authenticated;
GRANT ALL ON public.capacidade_pesos TO service_role;
ALTER TABLE public.capacidade_pesos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "capacidade_pesos leitura publica" ON public.capacidade_pesos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "capacidade_pesos admin insere" ON public.capacidade_pesos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "capacidade_pesos admin atualiza" ON public.capacidade_pesos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "capacidade_pesos admin remove" ON public.capacidade_pesos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER capacidade_pesos_updated_at BEFORE UPDATE ON public.capacidade_pesos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.capacidade_pesos (indicador, rotulo, bloco, peso_bloco, peso, ativo, origem, justificativa)
SELECT v.indicador, v.rotulo, v.bloco, 25, 1, v.ativo, v.origem,
  CASE WHEN v.indicador = 'posdoc' THEN 'Sem fonte aberta confirmada; depende do Extrator Lattes ou de dados de bolsas. ' ELSE '' END ||
  'Blocos funcionais com pesos iguais como ponto de partida (hipótese de trabalho, sem validação empírica). Método segue as etapas do OECD/JRC Handbook on Constructing Composite Indicators: normalização, ponderação, agregação e análise de sensibilidade.'
FROM (VALUES
  ('mestres_titulados','Mestres titulados','Formação de pessoas',true,'indicadores_uf'),
  ('doutores_titulados','Doutores titulados','Formação de pessoas',true,'indicadores_uf'),
  ('posdoc','Pós-doutorado','Formação de pessoas',false,'indicadores_uf'),
  ('universidades','Universidades e IFs','Base de pesquisa',true,'research_locations'),
  ('institutos_ict','Institutos e ICTs','Base de pesquisa',true,'research_locations'),
  ('embrapii','Unidades EMBRAPII','Intermediação',true,'research_locations'),
  ('habitats','Habitats de inovação','Intermediação',true,'research_locations'),
  ('startups','Startups','Mercado e proteção',true,'research_locations'),
  ('patentes_residentes','Patentes de residentes','Mercado e proteção',true,'indicadores_uf')
) AS v(indicador, rotulo, bloco, ativo, origem);

CREATE VIEW public.v_capacidade_uf_contagens WITH (security_invoker = true) AS
WITH c AS (
  SELECT uf, CASE
    WHEN tipo ILIKE '%embrapii%' THEN 'embrapii'
    WHEN tipo ILIKE '%universidade%' OR tipo ILIKE '%instituto federal%' THEN 'universidades'
    WHEN tipo ILIKE '%ICT%' OR tipo ILIKE '%instituto%' OR tipo ILIKE '%laboratório de pesquisa%' OR tipo ILIKE '%centro de pesquisa%' OR tipo ILIKE '%supercomputação%' THEN 'institutos_ict'
    WHEN tipo ILIKE '%startup%' THEN 'startups'
    ELSE 'habitats' END AS cat
  FROM public.research_locations WHERE uf IS NOT NULL
)
SELECT uf,
  count(*) FILTER (WHERE cat = 'universidades')::int AS universidades,
  count(*) FILTER (WHERE cat = 'institutos_ict')::int AS institutos_ict,
  count(*) FILTER (WHERE cat = 'embrapii')::int AS embrapii,
  count(*) FILTER (WHERE cat = 'habitats')::int AS habitats,
  count(*) FILTER (WHERE cat = 'startups')::int AS startups,
  count(*)::int AS total
FROM c GROUP BY uf;
GRANT SELECT ON public.v_capacidade_uf_contagens TO anon, authenticated, service_role;