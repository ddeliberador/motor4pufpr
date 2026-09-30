# Catálogo de Bases como fonte da verdade

## Objetivo
Uma única lista oficial de bases, guardada no banco. Dela saem a página pública Bases, a aba Catálogo de Fontes, o Mapa, o Motor e o construtor de gráficos. Só administradores editam.

## O que o usuário vai ver
- **Página Bases (pública):** mesma aparência de hoje, mas lendo do catálogo único (as 62 fontes do Motor, as 33 do Mapa e as 27 do Catálogo de Fontes, unificadas e sem repetição).
- **Catálogo de Fontes (área logada):** vira o editor do catálogo. O admin cria, edita, ativa ou desativa uma base, define situação, licença, link, a que o Mapa/Motor/construtor ela serve e, para o construtor, as colunas oferecidas. Colab (Eunice) só lê.
- **Construtor de gráficos:** a lista de bases e as colunas passam a vir do catálogo. Base desativada some do construtor; gráfico salvo com ela mostra "base desativada no catálogo".
- **Mapa:** cada camada consulta o catálogo; camada de base desativada não aparece e mostra o motivo na legenda.
- **Motor:** as fontes desativadas no catálogo deixam de ser consultadas na busca e aparecem como "desativada no catálogo" no quadro de fontes consultadas.

## Etapas
1. Criar a tabela do catálogo e copiar para ela as três listas atuais (com mesclagem por nome e revisão das duplicadas).
2. Página Bases e Catálogo de Fontes lendo/editando o catálogo.
3. Construtor lendo bases e colunas do catálogo.
4. Mapa e Motor respeitando "ativa/desativada".
5. Teste no navegador de cada ponto, com login de admin e de Colab.

## Detalhes técnicos
- Tabela `catalogo_bases`: `chave` (única, ex.: `aneel_siga`), nome, mantenedor, nacionalidade, uso, nota, licença, url, situação, `ativa` bool, `usos` text[] (`motor`,`mapa`,`bi`), camada do Mapa (L1–L7), `caminho_consumo` (enum: `gold_tabela`, `funcao_mapa`, `snapshot_publico`, `api_cliente`, `funcao_motor`), `alvo` (nome da tabela/camada/arquivo), `colunas` jsonb (`[{name,label,kind}]`), `doc_md` (caminho em `docs/fontes/`), timestamps.
- GRANT SELECT para anon/authenticated (catálogo é público); INSERT/UPDATE/DELETE só via política `is_admin()`; ALL para service_role.
- `mapa_inovacao_fontes` fica como está e é marcada `DEPRECATED` (sem apagar), após cópia.
- Construtor: `DATASETS` deixa de ser lista fixa; as funções de carga (`load`) ficam no código, indexadas por `chave`. O catálogo escolhe quais existem e as colunas; uma chave sem carga no código aparece como "sem conector".
- Motor: `motor-search` lê `catalogo_bases` (service role) no início e pula conectores com `ativa=false`, registrando no retorno.
- Por regra do projeto, a migração será escrita em `docs/migrations-pending/` e só aplicada com a aprovação deste plano.
