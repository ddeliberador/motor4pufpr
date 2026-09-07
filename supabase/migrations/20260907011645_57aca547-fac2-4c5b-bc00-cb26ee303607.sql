INSERT INTO community_feedback (
  type,
  status,
  message,
  faq_question,
  faq_answer,
  context_query,
  context_persona,
  email
)
SELECT
  'duvida',
  'publicado',
  'Os resultados da minha busca ficam salvos? O que exatamente é armazenado?',
  'Os resultados da minha busca ficam salvos? O que exatamente é armazenado?',
  'Sim, parcialmente: a cada busca, o Motor guarda os valores dos índices GT/CD/AUE/EI e algumas estatísticas (total de papers, contratos, TRL) associados ao tema pesquisado — não à pessoa que pesquisou. Não é gravado nome, e-mail, IP ou qualquer dado de quem fez a busca. É esse histórico por tema, acumulado busca após busca, que forma a composição histórica: conforme mais pessoas pesquisam o mesmo tema ao longo do tempo, o gráfico de evolução (visível logo abaixo dos índices, nas 4 perspectivas) vai ganhando mais pontos e mostrando a tendência real do campo.',
  NULL,
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM community_feedback
  WHERE faq_question = 'Os resultados da minha busca ficam salvos? O que exatamente é armazenado?'
);