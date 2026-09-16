INSERT INTO public.build_log (data, categoria, titulo, descricao, eh_mapa_inovacao)
VALUES (
  '2026-09-16',
  'correcao_interface',
  'Mapa — seletor de modo restaurado sem o card Data Lake',
  'Corrigida a remoção anterior: o seletor de modo (Bases de origem / Data Lake Cruzado) volta a aparecer na coluna lateral do /mapa. O card decorativo "Data Lake Unificado" permanece removido; no modo Data Lake são exibidos apenas os eixos canônicos de filtragem (tema, natureza, função, território, cobertura).',
  true
);
