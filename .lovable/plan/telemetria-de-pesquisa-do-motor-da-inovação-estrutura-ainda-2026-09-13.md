# Telemetria de pesquisa do Motor da Inovação (estrutura, ainda desligada)

Objetivo: preparar toda a coleta anônima de uso descrita nos rascunhos anexados, guardando os dados no banco do próprio Motor (Lovable Cloud), sem coletar nada até você liberar.

## Princípio central: interruptor desligado

- Existe um único interruptor de coleta. Enquanto ele estiver desligado, nenhum evento sai do navegador — as chamadas simplesmente não fazem nada.
- Nenhum aviso de consentimento é exibido agora. Quando o texto for aprovado pelo CEP, basta adicionar o banner e ligar o interruptor; nada mais precisa mudar.
- Nunca é enviado texto livre: nem o termo pesquisado, nem comentários. Só categorias, números e verdadeiro/falso.

## O que passa a ser medido (quando ligado)

1. Escolha de persona e realização de busca (sem o texto da busca; apenas se houve busca e quantos resultados voltaram).
2. Abertura de resultados e troca de abas nos painéis (qual aba, qual tipo de resultado).
3. Exportações: PDF e CSV.
4. Microfeedback "foi útil?": útil/não útil e o tamanho do comentário — nunca o comentário.

## Onde os dados ficam

Nova tabela `telemetry_events` no banco do Motor:

- `session_id` (aleatório, gerado no navegador, sem vínculo com identidade)
- `event_type`, `payload` (JSON curto), `client_ts`, `received_at`

Regras de acesso: qualquer visitante pode registrar evento, mas ninguém pode ler, alterar ou apagar pela aplicação; só a leitura administrativa (admin) é liberada, para você analisar depois na Gestão da Pesquisa.

## Detalhes técnicos

- Migração: `public.telemetry_events` com GRANT para `anon`/`authenticated` (apenas inserção), `service_role` completo, RLS ativa; política de inserção restrita aos cinco tipos de evento permitidos e a payload sem strings longas (validação por trigger `BEFORE INSERT`, que descarta chaves com texto acima de 40 caracteres). `SELECT` só via `public.is_admin()`.
- `src/lib/telemetry.ts` (adaptado do rascunho): fila em memória, flush por `setInterval` de 5s e em `beforeunload`, `session_id` em `sessionStorage`, gravação em lote via `supabase.from("telemetry_events").insert(...)` em vez do endpoint Railway. Guard duplo: `TELEMETRY_ENABLED = false` e `hasConsent()`.
- `src/lib/consent.ts`: apenas `hasConsent()`/`setConsent()` lendo `motor_inovacao_consent_v1` no `localStorage`. O componente de banner não entra nesta etapa.
- Chamadas `track(...)` inseridas em: `PersonaSelector`/`Index` (persona), `useMotorSearch` (busca concluída, contagem de fontes), `DataDetailSheet` e as `Tabs` dos painéis de persona (`PesquisadorPanel`, `EmpresaPanel`, `GovernoPanel`, `UniversidadePanel`), exportações jsPDF/CSV existentes, e `FeedbackTab` (`trackMicrofeedback`).
- O rascunho `telemetry_endpoint_example.py` fica fora do escopo: não haverá endpoint no Railway.
- Nenhuma alteração visual na interface.

## Fora do escopo agora

Banner de consentimento, TCLE da camada 3, painel de análise dos eventos e ativação da coleta.
