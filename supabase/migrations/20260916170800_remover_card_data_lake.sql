INSERT INTO public.build_log (data, categoria, titulo, descricao, eh_mapa_inovacao)
VALUES (
  '2026-09-16',
  'decisao_arquitetura',
  'Mapa — card Data Lake removido da coluna lateral',
  'Removido o painel/card "Data Lake Cruzado" da coluna lateral de filtros do /mapa. O seletor de modo (Data Lake vs Bases de Origem) foi eliminado e a página passa a exibir diretamente os filtros por região, estado, tipo, segmento e base de origem. As Métricas do cruzamento continuam disponíveis, agora alimentadas por cálculo interno dos itens filtrados.',
  true
);
