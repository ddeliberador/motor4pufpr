# Aba "Análise de Mercado" (Empresa + Governo)

Uma nova aba nos painéis de Empresa e Governo reunindo quatro blocos: detentores de patente, participação no mercado nacional, concorrentes e oportunidades. Mesmo componente nos dois perfis, com ênfases diferentes.

## Pré-requisito: chave EPO OPS

O INPI não expõe API pública. A fonte real de titulares de patentes será o **EPO Open Patent Services** (Espacenet), que cobre depósitos brasileiros pela família mundial e permite busca por código IPC e por termo.

O usuário precisa criar uma conta gratuita em `developers.epo.org`, registrar um app e obter **Consumer Key** e **Consumer Secret**. Depois disso, os dois valores serão solicitados em formulário seguro (`EPO_OPS_KEY`, `EPO_OPS_SECRET`). Sem a chave, o bloco de patentes fica vazio com aviso de configuração — nunca com dados simulados.

## Backend

**Nova edge function `market-analysis`** (roda em paralelo, não bloqueia a busca principal):

1. **Detentores de patente — EPO OPS**
   - Autenticação OAuth2 client_credentials (token em cache na memória da função).
   - Busca `published-data/search/biblio` combinando os códigos IPC vindos da ontologia com os termos de busca expandidos.
   - Agrega por *applicant*: número de famílias, países de depósito, anos, se há depósito BR.
   - Retorna top 20 titulares, com link direto para o Espacenet de cada família.

2. **Participação no mercado — compras públicas**
   - PNCP + Portal da Transparência (já integrados em `layer-policy`) agregados por CNPJ do fornecedor.
   - Share = valor contratado do fornecedor / valor total do setor no período. Índice HHI de concentração.
   - Enriquecimento por CNPJ via BrasilAPI (razão social, porte, UF, CNAE, capital social).

3. **Estrutura de mercado — CEMPRE/IBGE + COMEX**
   - Reaproveita a divisão CNAE da ontologia: número de empresas, pessoal ocupado e distribuição por UF (tabela 992, já usada em `layer-sidra`).
   - Balança comercial por NCM (COMEX), indicando dependência de importação.

4. **Oportunidades — derivadas, não inventadas**
   - Lacuna de titularidade: IPC com patentes estrangeiras e nenhum depositante BR.
   - Lacuna de fornecimento: compras públicas concentradas em poucos fornecedores (HHI alto).
   - Déficit comercial por NCM: importação alta e produção nacional baixa.
   - Base científica sem tradução: publicações BR altas com poucos titulares/contratos (usa o índice GT já existente).
   - Cada oportunidade traz o dado numérico que a sustenta e o link da fonte.

**Alteração em `motor-search`**: repassar `ipc_codes`, `cnae_codes` e `ncm_codes` para a nova função e agregar o resultado em `layers.market`.

## Frontend

**Novo componente `src/components/shared/MarketAnalysisPanel.tsx`**, com prop `perfil: "empresa" | "governo"`:

- Bloco de patentes: tabela de titulares (empresa, país, nº de famílias, tem depósito BR), com destaque para atores nacionais.
- Bloco de participação: barras de share por fornecedor + card de HHI com leitura de concentração; ao lado, estrutura setorial (empresas, pessoal ocupado, mapa por UF) e saldo comercial NCM.
- Bloco de concorrentes: reutiliza a `competitor-search` já existente (hoje só no painel Empresa), agora também no Governo.
- Bloco de oportunidades: cards com o dado que sustenta cada uma.

Ênfases por perfil:
- **Empresa**: quem detém a patente que eu preciso licenciar, quem são meus concorrentes, onde há espaço comercial.
- **Governo**: grau de concentração do mercado, dependência tecnológica externa, lacunas de fornecimento nacional a serem induzidas por política.

Nova aba `🏭 Análise de Mercado` em `EmpresaPanel.tsx` e `GovernoPanel.tsx`, no padrão visual sóbrio já usado (sem gradientes, cards institucionais).

## Detalhes técnicos

- Timeout de 20s por fonte, `Promise.allSettled` — uma fonte fora do ar não derruba a aba.
- Todo bloco sem dados mostra estado vazio explícito com a fonte consultada e o motivo. Zero dados simulados.
- Rate limit do OPS (free tier): no máximo 3 requisições por busca, com cache do token.
- Arquivos tocados: `supabase/functions/market-analysis/index.ts` (novo), `supabase/functions/motor-search/index.ts`, `src/components/shared/MarketAnalysisPanel.tsx` (novo), `src/components/empresa/EmpresaPanel.tsx`, `src/components/governo/GovernoPanel.tsx`, `src/hooks/useMotorSearch.ts` (tipos).
