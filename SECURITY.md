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

O Motor da Inovação **não coleta dados pessoais sensíveis de usuários**. As buscas
consultam exclusivamente **APIs públicas e bases abertas** (OpenAlex, IBGE, IPEAData,
Portal da Transparência, PNCP, CNPq, EPO, dados.gov.br, entre outras). A área restrita
de gestão da pesquisa é de uso do mantenedor e protegida por autenticação e políticas
de acesso por linha (RLS) no banco.
