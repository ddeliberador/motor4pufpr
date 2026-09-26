# Separar o catálogo de bases da Documentação

## O que será feito

1. Criar a página pública **Bases**, mantendo o cabeçalho, rodapé, animações e cartões usados na Documentação.
2. Reunir em **Bases do Motor** as quatro camadas do catálogo resumido e a tabela completa de recursos, removendo duplicatas evidentes e preservando mantenedor, nacionalidade, uso e links disponíveis.
3. Criar **Bases do Mapa** como seção independente, com as oito fontes solicitadas, indicação de fonte compartilhada ou exclusiva e somente números e limitações já documentados em `docs/fontes`.
4. Remover da Documentação os dois catálogos migrados e deixar um convite curto para acessar `/bases`.
5. Registrar `/bases` no aplicativo e adicionar **Bases** ao menu principal no computador e no celular, ao lado de Documentação.
6. Validar a nova página, navegação, ausência de duplicatas óbvias e integridade visual em telas ampla e móvel.

## Decisões de conteúdo

- Entradas equivalentes como OpenAlex, INPI, PNCP, CAPES/Sucupira, CNPq/Lattes e outras serão consolidadas em uma única linha.
- O catálogo não afirmará que toda fonte está disponível quando a documentação registra limitações ou bloqueios.
- As contagens do Mapa serão copiadas das fichas documentais existentes; nenhuma estimativa nova será criada.

## Detalhes técnicos

- O catálogo consolidado ficará na nova página, sem criar dependências de dados ou alterar consultas.
- `Documentacao.tsx` manterá apenas um bloco breve com link para a nova página.
- A rota e os dois menus usarão o mesmo padrão de navegação já existente.
