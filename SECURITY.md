# Política de Segurança

## Como reportar uma vulnerabilidade

**Não abra uma issue pública** para relatar falhas de segurança.

Envie um relato privado para **deciodeliberador@ufpr.br** com:

- descrição da falha e impacto potencial;
- passos para reproduzir;
- versão/commit e ambiente utilizado.

Prazo de resposta esperado: até 7 dias corridos para a confirmação do recebimento
e até 30 dias para uma correção ou plano de mitigação, conforme a gravidade.
Pedimos que não divulgue publicamente a falha antes da correção.

## Chaves de API e variáveis de ambiente

- Nenhuma chave real é versionada. Os arquivos `.env.example` (raiz e `backend/`)
  contêm apenas **nomes de variáveis e valores de exemplo**.
- Chaves reais devem ficar no `.env` local (ignorado pelo Git) ou nos segredos do
  ambiente de execução (Railway / Lovable Cloud).
- Se você identificar uma chave exposta no repositório, reporte pelo canal privado acima.

## Dados de usuários

As buscas consultam exclusivamente **APIs públicas e bases abertas** (OpenAlex, IBGE,
IPEAData, Portal da Transparência, PNCP, CNPq, EPO, dados.gov.br, entre outras). Não é
necessário criar conta nem fazer login para pesquisar, e não há cookies de rastreamento.

Mesmo assim, **alguns dados são coletados e armazenados**, e é importante ser explícito:

- **Termo de busca**: cada busca grava o tema pesquisado (texto original e normalizado),
  a UF/município selecionados e os indicadores calculados na tabela `search_snapshots`.
  Esse registro forma o histórico temporal por tema e **não é vinculado a nenhuma pessoa**
  (não gravamos nome, e-mail, IP ou identificador de sessão junto do snapshot).
- **Mensagem de sugestão/dúvida e e-mail**: o formulário do FAQ armazena a mensagem
  enviada, o tipo, o tema e a perspectiva em uso no momento e, se a pessoa informar,
  o **e-mail de contato** (campo opcional). Esses dados ficam na tabela `community_feedback`
  e são legíveis apenas por contas com papel de administrador (`public.is_admin()`);
  o FAQ público expõe somente pergunta e resposta editadas para publicação.
- **Endereço IP**: usado de forma temporária apenas para limitar abuso nas funções de IA
  (tabela `ai_rate_limits`), com expurgo dos registros após 24 horas. Não é associado ao
  termo pesquisado.

Para solicitar a exclusão de uma mensagem ou e-mail enviados, escreva para o canal de
contato acima. A área restrita de gestão da pesquisa é de uso do mantenedor e protegida
por autenticação e políticas de acesso por linha (RLS) no banco.
