import { useCallback, useEffect, useState } from "react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Plus, Download, Trash2, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type BuildLogEntry = {
  id: string;
  data: string;
  categoria: string;
  titulo: string;
  descricao: string | null;
  fonte: string | null;
  dificuldade: string | null;
  resolucao: string | null;
  eh_achado_pesquisa?: boolean;
  nota_desenvolvimento?: string | null;
};


const CATEGORIAS = [
  { value: "fonte_de_dado", label: "NOVA FONTE ADICIONADA" },
  { value: "decisao_arquitetura", label: "Decisão de arquitetura" },
  { value: "obstaculo_institucional", label: "Obstáculo institucional" },
  { value: "correcao_bug", label: "Correção de bug" },
  { value: "integracao_externa", label: "Integração externa" },
];

const catLabel = (c: string) => CATEGORIAS.find((x) => x.value === c)?.label ?? c;

const catStyle: Record<string, string> = {
  fonte_de_dado: "bg-blue-600 text-white border-transparent",
  decisao_arquitetura: "bg-violet-600 text-white border-transparent",
  obstaculo_institucional: "bg-amber-600 text-white border-transparent",
  correcao_bug: "bg-rose-600 text-white border-transparent",
  integracao_externa: "bg-teal-600 text-white border-transparent",
};

const fmtDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

export function BuildLogTab({ canEdit }: { canEdit: boolean }) {
  const [entries, setEntries] = useState<BuildLogEntry[]>([]);
  const [filter, setFilter] = useState("all");
  const [onlyAchados, setOnlyAchados] = useState(false);

  const [exporting, setExporting] = useState(false);

  const SEED_ENTRIES: Omit<BuildLogEntry, "id">[] = [
    {
      data: "2026-07-31",
      categoria: "decisao_arquitetura",
      titulo: "Arquitetura inicial — 8 edge functions em paralelo com Promise.all",
      descricao: "Deploy das camadas analíticas do Motor: layer-knowledge (OpenAlex), layer-technology (GitHub + CAGED + CNAE + NCM), layer-policy (PNCP + Transparência), layer-international (BCB + COMEX), layer-sidra (PINTEC + CEMPRE + PIB), layer-patents (EPO OPS), layer-cnpq (bolsas + convênios MCTI) e motor-search como orquestrador. Todas as layers executam em paralelo via Promise.all com timeout individual.",
      fonte: "Supabase Edge Functions (Deno) · Railway backend Python · Lovable project 980435df",
      dificuldade: "fetchCaged chamava PNADC/IBGE (20s+) + loadCnaeCache (20s) em sequência — estourava o limite de 60s das edge functions do Supabase.",
      resolucao: "CNAE offline por dicionário semântico estático (~120 termos curados), CAGED simplificado via IPEAData (3 séries nacionais, ~3s), NCM com Promise.race de 8s. Tempo total da layer-technology: de 80s para 8–12s.",
    },
    {
      data: "2026-07-31",
      categoria: "obstaculo_institucional",
      titulo: "Matching semântico CNAE: terminologia técnica vs. linguagem jurídica do Estado",
      descricao: "A CNAE usa linguagem jurídica oficial ('horticultura', 'cultivo') enquanto usuários usam termos técnicos/comerciais ('hidropônico', 'aquaponia', 'fotovoltaico'). Nenhum algoritmo de busca textual resolve isso: 0121-1/01 se chama 'Horticultura, exceto morango' — a palavra 'hidropônico' não existe nas descrições CNAE. Isso revela uma limitação estrutural: a classificação oficial do Estado não acompanha a terminologia do mercado.",
      fonte: "CONCLA 2.3 · IBGE · API servicodados.ibge.gov.br/api/v2/cnae/subclasses",
      dificuldade: "Busca textual por 'hidropônico' retornava CNAEs não relacionados (Seção C — indústria de transformação) em vez de 0121-1/01 e 0121-1/02 (horticultura). Mesmo problema para 'fotovoltaico', 'bateria de lítio', 'drone', 'smartphone'.",
      resolucao: "Dicionário semântico curado CNAE_SEMANTIC com ~120 entradas mapeando termos técnicos diretamente às subclasses corretas (fonte: CONCLA 2.3 oficial). Match semântico tem prioridade (score 999) sobre score textual. CNAE_STATIC com descrições completas de ~80 subclasses embutido no código — elimina chamada HTTP à API IBGE para casos cobertos pelo dicionário.",
    },
    {
      data: "2026-07-31",
      categoria: "obstaculo_institucional",
      titulo: "CAGED por CNAE: limitação estrutural dos dados públicos brasileiros",
      descricao: "Dado de emprego formal por CNAE específico (ex: empregos em 'horticultura hidropônica') não está disponível em API pública aberta. Os microdados CAGED por CNAE/subclasse exigem acesso especial ao PDET/MTE — arquivos txt de gigabytes sem REST API.",
      fonte: "IPEAData · Novo CAGED/MTE · Portal PDET/MTE",
      dificuldade: "IPEAData tem séries por seção CNAE (letra A, B, C...) mas não por divisão/subclasse. A série nacional CAGED12_SALDON12 agrega toda a economia — não distingue 'fabricação de computadores' de 'fabricação de calçados'.",
      resolucao: "Para granularidade estadual: séries ADMISNC e DESLIGNC com filtro TERCODIGO (código IBGE da UF). Para CNAE: impossível via API pública — exibe dado estadual quando há localização configurada + nota honesta de limitação. Transparência epistemológica como princípio: documentar a limitação é parte do resultado da pesquisa.",
    },
    {
      data: "2026-07-31",
      categoria: "decisao_arquitetura",
      titulo: "EPO OPS — OAuth2 para dados de patentes internacionais",
      descricao: "Integração com o European Patent Office Open Patent Services (EPO OPS) para busca de patentes por IPC, ranking de depositantes e estimativa de TRL a partir do portfólio de patentes. Credenciais via variáveis de ambiente EPO_OPS_KEY e EPO_OPS_SECRET.",
      fonte: "EPO OPS API · ops.epo.org/3.2/rest-services",
      dificuldade: "EPO OPS usa OAuth2 com token Bearer — diferente de todas as outras APIs que usam chave simples. Token expira a cada hora.",
      resolucao: "Implementado fetch do token OAuth2 no início de cada invocação da layer-patents, com cache do token por 55 minutos via variável de módulo Deno. Inclui alerta de soberania tecnológica no frontend quando maioria das patentes é de depositantes estrangeiros.",
    },
    {
      data: "2026-07-31",
      categoria: "decisao_arquitetura",
      titulo: "Redesenho completo de UX/acessibilidade — linguagem para leigos",
      descricao: "Análise identificou que o Motor usava jargão técnico em toda a interface: 'saldo líquido', 'seção CNAE B', 'série nacional agregada', 'CBO', 'ICT', 'TRL', países como siglas (MX, ES, CO). Reestruturação completa para linguagem direta e acessível.",
      fonte: "Princípio de design: qualquer cidadão sem formação técnica deve entender os dados",
      dificuldade: "Balancear precisão técnica com acessibilidade — cada aba tinha dados corretos mas incompreensíveis para o público-alvo (gestor público, empresário, pesquisador não-especialista em política de CT&I).",
      resolucao: "Cada aba passa a abrir com card de contexto: título em pergunta direta + parágrafo explicando a fonte, origem e relevância. StrategicIndices reescritos: 'Gap de Tradução' → '🔬 Ciência vira produto?', 'Dependência Científica' → '🌍 Pesquisa própria ou importada?'. Países com nome completo + bandeira emoji. Números CAGED com labels descritivos ('pessoas contratadas com carteira', não 'admissões').",
    },
    {
      data: "2026-07-31",
      categoria: "integracao_externa",
      titulo: "Decreto 70.683/SP (16/06/2026) — Política Estadual de Distritos de Inovação",
      descricao: "Incorporação do decreto publicado em 16/06/2026, não indexado em treinamentos de IA. Cria distritos de inovação como áreas urbanas com governança descentralizada, exige mínimo de 2 organizações-âncora, institui Conselho de Orientação com 13 membros e o Selo Paulista para Distritos de Inovação.",
      fonte: "Diário Oficial do Estado de São Paulo · Decreto 70.683/2026",
      dificuldade: "Lei nova publicada durante o desenvolvimento — não existia em nenhuma base de treinamento de IA disponível. Precisou ser incorporada manualmente como curadoria.",
      resolucao: "Adicionada à layer-policies como curadoria estática PEDI-SP com relevância diferenciada por perfil: pesquisador (ICT como âncora elegível), universidade (âncora obrigatória — novos fluxos de financiamento), empresa (Selo Paulista facilita acesso a VC), governo (instrumento territorial de CT&I).",
    },
    {
      data: "2026-07-31",
      categoria: "integracao_externa",
      titulo: "Lei do Bem 2024 — dados reais publicados pelo MCTI em 16/07/2026",
      descricao: "Incorporação dos dados do ano-base 2024 da Lei do Bem: 4.252 empresas beneficiadas, R$ 51,59 bilhões em P&D, renúncia fiscal de R$ 11,98 bilhões. Publicação do MCTI de 16/07/2026 — dados 20 dias antes do início do desenvolvimento.",
      fonte: "MCTI · Portal Lei do Bem · Formulário FORMP&D · dados.gov.br",
      dificuldade: "Dado muito recente, não disponível em APIs estruturadas — apenas em PDF e página HTML do MCTI.",
      resolucao: "Curadoria manual com os dados reais embutidos na layer-policies e no MuralOportunidades. Calculadora de Lei do Bem implementada no EmpresaPanel: faturamento → investimento P&D → dedução IRPJ/CSLL (60–80%) → economia estimada a 34% (IRPJ 25% + CSLL 9%).",
    },
    {
      data: "2026-08-01",
      categoria: "decisao_arquitetura",
      titulo: "Redesenho do perfil Empresa — do dado para a decisão de negócio",
      descricao: "O painel da empresa tinha 8+ abas fragmentadas com indicadores nacionais genéricos. Reestruturação para 3 perguntas de negócio em scroll linear sem abas: (1) Vale entrar nesse mercado?, (2) Quanto custa inovar?, (3) Quem pode me ajudar?",
      fonte: "Design Science Research · Princípio: o artefato deve gerar valor imediato para o usuário-alvo",
      dificuldade: "TRL, CNAE, ICT, CBO são conceitos desconhecidos para o empresário. Dados nacionais agregados (26M de admissões) não dizem nada sobre o mercado específico do empresário.",
      resolucao: "TRL traduzido em decisão make-or-buy com linguagem direta ('✅ Tecnologia madura — comprar ou licenciar' vs '🔬 Investir em P&D próprio'). ICTs com pesquisadores nominados e pills clicáveis linkando para OpenAlex. Modal passo a passo Marco Legal CT&I. Análise IA colapsada por padrão — o empresário decide quando quer mais profundidade.",
    },
    {
      data: "2026-08-01",
      categoria: "integracao_externa",
      titulo: "Localização geográfica como variável de contexto transversal nos 4 perfis",
      descricao: "Implementação de seletor Estado + Município na tela de busca, propagado via sessionStorage para todas as 4 edge functions e os 4 painéis. Municípios carregados em tempo real via API IBGE localidades (~5.570 municípios).",
      fonte: "IBGE API v1/localidades · IPEAData TERCODIGO · PNCP ufSigla · OpenAlex city filter",
      dificuldade: "Cada API usa um identificador diferente para localidade: IPEAData usa código IBGE numérico (41 = PR), PNCP usa sigla UF (PR), OpenAlex usa nome da cidade em inglês.",
      resolucao: "Tabela de correlação UF → código IBGE embutida na layer-technology e layer-sidra. layer-policy filtra PNCP por ufSigla + esfera E/M. layer-knowledge faz busca paralela no OpenAlex por instituições na cidade. Badge localização no topo de cada painel com CTA de remoção.",
    },
    {
      data: "2026-08-01",
      categoria: "decisao_arquitetura",
      titulo: "Mural de Oportunidades — R$ 3,6bi+ em subvenção visível ao empresário",
      descricao: "Nova layer-oportunidades e componente MuralOportunidades. Premissa: a maioria dos empresários não sabe que R$ 3,6bi em subvenção Finep estão disponíveis em 2026 sem devolução — e o governo não comunica isso de forma acessível. O Motor deve ser a ponte entre o recurso público e o empresário.",
      fonte: "PNCP API (pregões abertos) · Curadoria de editais Finep/BNDES/EMBRAPII 2026 · 12 FAPs estaduais mapeadas",
      dificuldade: "Finep não tem API pública de chamadas abertas — dados só disponíveis em HTML/PDF no portal. Prazos de editais mudam e precisam de atualização constante.",
      resolucao: "Curadoria estática de 10 instrumentos federais com verbas concretas, atualizada manualmente. Pregões abertos via PNCP em tempo real com classificação de urgência (🔴 ≤15 dias, 🟡 ≤60 dias, 🟢 aberto). FAP estadual em destaque quando há UF configurada. FAPESP PIPE destacado para SP (até R$ 2M sem devolução). Verba como primeira informação visível ao expandir card.",
    },
    {
      data: "2026-08-01",
      categoria: "integracao_externa",
      titulo: "NCM por CNAE — correlação estruturalmente ausente nas bases públicas brasileiras",
      descricao: "Não existe tabela oficial NCM→CNAE publicada pelo governo brasileiro. A correlação existe nos microdados RAIS (CNAE do estabelecimento + NCM dos produtos declarados ao fisco), mas esses dados são sigilosos. O MDIC publica Tabela de Correlações com agrupamentos setoriais próprios, não CNAE.",
      fonte: "MDIC · CONCLA/IBGE · RAIS/MTE · Tabela NCM ComexStat",
      dificuldade: "O Motor precisava cruzar produto (NCM) com setor econômico (CNAE) para conectar dados de comércio exterior com dados de emprego. Lacuna estrutural nos dados públicos.",
      resolucao: "NCM lookup via API ComexStat MDIC (busca textual em ~12.000 códigos, timeout 8s) retorna os NCMs do produto. CNAE é resolvido independentemente via dicionário semântico. Os dois são exibidos lado a lado no CnaeNcmCard como classificações complementares, sem forçar correlação que não existe nas bases públicas.",
    },
    {
      data: "2026-08-10",
      categoria: "integracao_externa",
      titulo: "Mapa da Inovação (MCTI) — equipamentos de inovação por estado integrado ao Motor",
      descricao: "Decisão de integrar o Mapa da Inovação do MCTI como nova fonte de dados no Motor. Permite mostrar, na visão por estado do empresário e do pesquisador, os equipamentos/habitats de inovação fisicamente disponíveis na região: parques tecnológicos, incubadoras credenciadas, laboratórios abertos, centros de P&D.",
      fonte: "Mapa da Inovação MCTI · mapainovacao.mcti.gov.br · dados.gov.br",
      dificuldade: "A ser investigada — avaliar se o Mapa da Inovação tem API REST ou apenas interface web/CSV. Verificar se os dados incluem coordenadas geográficas para exibição em mapa.",
      resolucao: "A implementar — nova camada layer-mapa-inovacao ou extensão da layer-sidra. Resultado esperado: quando usuário seleciona estado, exibir lista/mapa dos habitats de inovação credenciados pelo MCTI naquele estado, com tipo (incubadora, parque, lab, aceleradora), localização e link de contato.",
    },
    {
      data: "2026-09-10",
      categoria: "integracao_externa",
      titulo: "Nova aba 'Empresas & Referências' no PesquisadorPanel",
      descricao: "Adicionada aba 🏢 Empresas & Referências ao painel do Pesquisador, usando a edge function competitor-search (já existente no EmpresaPanel). Três blocos: empresas na cidade do pesquisador (filtradas por municipioNome/UF via useMotorLocation), referências brasileiras (PNCP/CNPJ, qualquer UF) e referências globais (OpenAlex + GitHub por país e publicações).",
      fonte: "competitor-search edge function · BrasilAPI · PNCP · OpenAlex · GitHub",
      dificuldade: "A aba foi criada sem o TabsTrigger e sem o useEffect que dispara a busca — estava incompleta e sem créditos Lovable para finalizar na mesma sessão.",
      resolucao: "Enviada segunda mensagem para adicionar o TabsTrigger (value='empresas') na TabsList e o useEffect com supabase.functions.invoke('competitor-search') quando data?.query estiver disponível — mesmo padrão do useEffect de ICTs já existente.",
    },
    {
      data: "2026-09-10",
      categoria: "obstaculo_institucional",
      titulo: "Caso real: 'Reologia' retorna zero resultados — disciplinas científicas transversais sem CNAE",
      descricao: "Busca pelo termo 'Reologia' (tema de pesquisa da cunhada do pesquisador, UTFPR, projeto Petrobras) retornava resultado vazio. Causa raiz: ontology_engine.py usa dicionário fixo de ~23 palavras-chave e apenas 16 CNAEs — 'Reologia' não está em lugar nenhum. Problema estrutural: a CNAE classifica o que a empresa produz, não o conhecimento científico transversal que ela usa. Reologia se aplica a petróleo, alimentos, cosméticos, cimento, polímeros — nunca vai caber num único CNAE.",
      fonte: "backend/app/services/ontology_engine.py · CNAE 2.3 CONCLA · OpenAlex concepts API",
      dificuldade: "O motor foi desenhado em cima da lógica 'objeto tecnológico → CNAE', que funciona para produtos mas não para competências científicas transversais. Isso revela um viés estrutural do modelo linear de inovação: tratar ciência básica como automaticamente traduzível em classificação produtiva.",
      resolucao: "Três ajustes implementados: (1) expandir KEYWORD_MAPPINGS com 'reologia' e variações mapeando para múltiplos CNPq/CNAEs reais (refino, química, alimentos, cosméticos, cimento); (2) busca dupla no OpenAlex — resolve o conceito via endpoint /concepts antes da busca textual (multilíngue: 'Reologia' → 'Rheology'), aumentando recall para papers em inglês; (3) exibir áreas CNPq como classificação primária no PesquisadorPanel quando cnae_codes estiver vazio mas cnpq_areas tiver itens.",
    },
    {
      data: "2026-09-10",
      categoria: "decisao_arquitetura",
      titulo: "Busca dupla OpenAlex: mais citados + mais recentes em paralelo",
      descricao: "A busca de papers usava apenas sort=cited_by_count:desc — papers mais citados tendem a ser antigos e de subcampos grandes. Pesquisa aplicada recente (projetos com empresas, publicados nos últimos 1-3 anos) tem poucas citações e nunca entrava no top 15. Resultado: tudo 'muito conceitual', sem pesquisa ativa real.",
      fonte: "OpenAlex API · filtros: concepts.id + institutions.country_code:BR + sort=cited_by_count:desc + sort=publication_date:desc",
      dificuldade: "Uma única chamada ordenada por citação é estatisticamente correta para 'estado da arte' mas sistematicamente cega para quem está pesquisando agora.",
      resolucao: "Segunda chamada paralela com sort=publication_date:desc (últimos 2-3 anos). Resultados mesclados sem duplicatas por id. Totais baseados em meta.count real, não no tamanho da lista combinada. Enriquecimento (abstract/grants) para top 5 de cada lista.",
    },
    {
      data: "2026-09-10",
      categoria: "decisao_arquitetura",
      titulo: "Repositório preparado para open source — MIT, CITATION.cff, ARCHITECTURE.md, templates GitHub",
      descricao: "Preparação completa do repositório para o compromisso '100% open source' do projeto: LICENSE (MIT — sem arquivo de licença reconhecida, juridicamente ninguém pode reutilizar o código), CITATION.cff (citação acadêmica correta — autor: Decio Dalton Deliberador Filho / PPGPP UFPR / Orientador: Prof. Shima), README reescrito com arquitetura em três camadas, ARCHITECTURE.md, CONTRIBUTING.md (com passo a passo das edge functions Supabase/Deno), CODE_OF_CONDUCT.md e SECURITY.md (contato: deciodeliberador@ufpr.br), templates em .github/ (bug_report, feature_request, novo_conector, PR).",
      fonte: "GitHub standards · OSI · Contributor Covenant v2.1",
      dificuldade: "README existente só cobria backend Python (FastAPI) e motor de ontologia — não mencionava as Edge Functions do Supabase nem as personas do frontend. Contribuidor externo não entenderia metade da arquitetura real.",
      resolucao: "Template de issue 'novo_conector' específico para propor conectores de dados (pedindo: nome da fonte, URL API pública, tipo de dado, qual camada/persona serviria) — facilita contribuições alinhadas ao padrão dos ~30 conectores existentes.",
    },
    {
      data: "2026-09-10",
      categoria: "integracao_externa",
      titulo: "Layer-regional: PIB municipal SIDRA, SICONFI, Querido Diário — visão territorial nos 4 painéis",
      descricao: "Nova edge function layer-regional com 4 fontes em paralelo: (a) PIB municipal SIDRA tabela 5938 nível N6, com verificação dos códigos de variável reais via /desctabela antes de implementar; (b) execução orçamentária via SICONFI/Tesouro Nacional com função orçamentária 'Ciência e Tecnologia' (código 19) quando disponível; (c) menções no Diário Oficial local via Querido Diário filtrado por territory_ids={municipio_ibge}; (d) convênios federais via Portal da Transparência só se TRANSPARENCIA_API_KEY configurada (caso contrário, retorna available:false com motivo explícito). Nova aba '📍 Visão Regional' nos 4 painéis.",
      fonte: "SIDRA/IBGE tabela 5938 · SICONFI/STN · Querido Diário OK.BR · Portal da Transparência",
      dificuldade: "Cada bloco pode não ter dados para municípios pequenos — tratamento explícito obrigatório, nunca omissão silenciosa. Convênios: Transferegov.br foi avaliado como alternativa mas a API de integração estava com cadastro 'em breve' — mantido bloco como indisponível sem chave.",
      resolucao: "Cada bloco da resposta tem: dado, fonte com URL, e motivo explícito quando indisponível. Resultado: transparência metodológica mesmo para dados ausentes — a ausência do dado é, ela própria, uma informação sobre a infraestrutura de dados do município.",
    },
    {
      data: "2026-09-10",
      categoria: "integracao_externa",
      titulo: "Avaliação do Banco Brasileiro de IA (bancobrasileiro.ia.br) — BERTimbau, Tucano 2, bases de prontidão",
      descricao: "Análise de 6 modelos de IA abertos brasileiros e 36 fichas de bases de dados do catálogo bancobrasileiro.ia.br. Dois modelos identificados como relevantes: BERTimbau (NeuralMind/Unicamp, open source, roda em CPU) para substituir matching literal de termos no ontology_engine.py por similaridade semântica via embeddings — resolveria de forma geral o problema de CNAE por texto que o caso Reologia revelou. Tucano 2 (Apache-2.0) para substituir o Gemini no research-agent — fecharia inconsistência no compromisso open source ('toda a infraestrutura é pública e auditável' não se sustenta com modelo fechado pago).",
      fonte: "bancobrasileiro.ia.br/modelos · NeuralMind/BERTimbau · TucanoBR/Tucano-2",
      dificuldade: "BERTimbau resolveria o matching semântico de forma geral mas exige mudança na arquitetura do ontology_engine.py (pipeline de embeddings vs. dicionário fixo). Tucano 2 requer avaliação de qualidade das análises geradas vs. Gemini antes de substituir.",
      resolucao: "Implementação na fila — priority: (1) BERTimbau no ontology_engine (maior impacto técnico), (2) Tucano 2 no research-agent (consistência com compromisso open source). Bode descartado (requer GPU), Manacá-1B descartado (sem instrução), ptt5-v2 descartado (requer fine-tuning para sumarização).",
    },
    {
      data: "2026-09-10",
      categoria: "integracao_externa",
      titulo: "Tramitação legislativa via API Câmara dos Deputados — contexto regulatório por tema",
      descricao: "Novo bloco 'tramitacao_legislativa' adicionado ao layer-policies: proposições da Câmara dos Deputados relacionadas ao tema pesquisado, via API confirmada e documentada (dadosabertos.camara.leg.br/api/v2/proposicoes?keywords={query}), JSON sem autenticação. Sinal novo: 'janela ou risco regulatório' — se há PL tramitando sobre o tema, é informação relevante para Governo e Empresa. Senado avaliado mas endpoint de busca por palavra-chave não confirmado na documentação oficial (legis.senado.leg.br/dadosabertos/docs) — não implementado para não inventar parâmetros.",
      fonte: "dadosabertos.camara.leg.br · API v2/proposicoes",
      dificuldade: "Senado tem a base de dados mas a documentação disponível só mostrava buscas por ID de matéria, não por palavra-chave — impossível implementar com segurança sem confirmar endpoint real.",
      resolucao: "Câmara implementada. Senado: comentário no código explicando por que não foi incluído — transparência metodológica. Seção '📜 Tramitação Legislativa' na aba de políticas exibe até 5 proposições com ementa resumida, tipo/número/ano e link de acompanhamento; se vazia, mostra mensagem explícita em vez de esconder a seção.",
    },
    {
      data: "2026-09-10",
      categoria: "decisao_arquitetura",
      titulo: "Autenticação X-API-Key no Railway backend antes de compartilhamento institucional",
      descricao: "Antes de compartilhar o Motor com contatos institucionais (MCTI, Prof. Eunice Liu/UTFPR), foi adicionada autenticação simples via header X-API-Key no backend Railway. Plano inicial era OAuth2, mas X-API-Key é suficiente para o contexto atual de tese em desenvolvimento e não adiciona fricção para os poucos usuários autorizados.",
      fonte: "Railway · FastAPI middleware · variável de ambiente MCTI_API_KEY",
      dificuldade: "Trial do Railway expirou durante a sessão — exigiu upgrade para plano Hobby pago e redeploy com nova URL (motor4pufpr-copy-production-5681.up.railway.app). Variável MCTI_API_KEY precisou ser configurada manualmente nas Railway Variables após o redeploy.",
      resolucao: "Middleware de autenticação adicionado. Nova URL do backend documentada. Carla (revisora técnica) fará verificação de segurança inicial antes do compartilhamento institucional.",
    },
    {
      data: "2026-09-10",
      categoria: "integracao_externa",
      titulo: "Contato institucional MCTI — Prof. Eunice Liu (UTFPR/MCTI) como parceira potencial",
      descricao: "Identificação de Prof. Eunice Liu (UTFPR, seconded ao Ministério de Ciência, Tecnologia e Inovação — MCTI) como potencial parceira institucional para integração do Motor com as bases e APIs do ministério, incluindo acesso ao Mapa da Inovação e a outros conjuntos de dados não públicos do MCTI. Dois documentos preparados para o contato: (1) documento institucional formal, e (2) guia técnico de integração com a API key e exemplo curl.",
      fonte: "MCTI · UTFPR · API key Railway documentada",
      dificuldade: "Integração com MCTI depende de validação institucional e pode exigir credenciais de acesso diferenciado para bases com dado mais granular (não público) como o Mapa da Inovação completo.",
      resolucao: "Documentos preparados e entregues. Próximo passo: aguardar retorno da Prof. Eunice Liu sobre possibilidade de paroeria formal.",
    },
    {
      data: "2026-09-10",
      categoria: "decisao_arquitetura",
      titulo: "Memória temporal — search_snapshots e gráfico de evolução dos índices",
      descricao: "Implementação de tabela search_snapshots no Supabase para persistir resultados de cada busca (query, persona, índices GT/CD/AUE/EI, data). Permite mostrar como os índices de um tema evoluíram ao longo do tempo — ex: 'a articulação universidade-empresa neste campo melhorou 15 pontos em 6 meses'. Componente de gráfico de evolução temporal adicionado na área logada.",
      fonte: "Supabase PostgreSQL · search_snapshots table · recharts (gráfico de linha)",
      dificuldade: "Dados históricos só existem a partir da implementação — não há retroativamente.",
      resolucao: "Tabela criada com índices. Gráfico exibe evolução quando há mais de um snapshot para o mesmo par query+persona. Funcionalidade ativa mas com poucos dados ainda — crescerá com o uso.",
    },
    {
      data: "2026-09-10",
      categoria: "decisao_arquitetura",
      titulo: "StrategicIndices com fórmulas reais, números por busca e nível de confiança",
      descricao: "Os 4 índices (GT — Gargalo de Tradução, CD — Dependência Científica, AUE — Articulação Universidade-Empresa, EI — Efetividade Instrumental) passaram a exibir: fórmula de cálculo real, os números reais usados naquela busca, nível de confiança (high/medium/low com justificativa), e as camadas de dados usadas via Popover clicável.",
      fonte: "motor-analysis edge function · indices calculados por camada cruzada",
      dificuldade: "Índices antes mostravam só o número final sem contexto — o pesquisador não sabia como interpretar ou questionar o valor.",
      resolucao: "Popover com fórmula, componentes numéricos reais e nível de confiança. Muda a natureza epistemológica do Motor: de caixa-preta para artefato auditável.",
    },
    {
      data: "2026-09-10",
      categoria: "decisao_arquitetura",
      titulo: "Painel Estado — PIB, PIB per capita, participação setorial, tendência industrial e demografia",
      descricao: "Nova seção EstadoPanel com dados do estado selecionado pelo usuário: PIB estadual e PIB per capita com comparação ao benchmark nacional (gráfico linha), participação setorial donut (agro/indústria/serviços), tendência da participação industrial (últimos 5 anos), dados demográficos básicos. Ranking de empresas públicas por CNAE via CVM — com divulgação explícita de que os dados são parciais (apenas empresas com ações na bolsa).",
      fonte: "IBGE/SIDRA · CVM dados abertos · IBGE população",
      dificuldade: "CVM só cobre empresas de capital aberto — representa uma fração do setor produtivo real. Apresentar como 'empresas do setor' sem qualificação seria enganoso.",
      resolucao: "Card com disclaimer explícito: 'Dados parciais — apenas empresas com ações negociadas na B3. A maioria das empresas brasileiras é de capital fechado e não aparece aqui.' Transparência como princípio de design.",
    },
    {
      data: "2026-09-10",
      categoria: "integracao_externa",
      titulo: "ReData/MP 1.318/2026 — incentivo fiscal para data centers como sinal de política para TIC",
      descricao: "MP 1.318/2026 (Medida Provisória sobre incentivos fiscais para data centers no Brasil) identificada como nova política relevante para o Motor, especialmente para temas de TIC, cloud computing e infraestrutura digital. A base ReData do Ministério de Planejamento pode expor empresas beneficiárias.",
      fonte: "Banco Brasileiro de IA · MP 1.318/2026 · ReData/MP",
      dificuldade: "A ser investigada — verificar se ReData tem API pública ou apenas interface web.",
      resolucao: "A implementar como extensão da layer-policies para temas TIC/cloud. Catalogado como pendência para próxima sessão.",
    },
    {
      data: "2026-09-10",
      categoria: "integracao_externa",
      titulo: "Base de conhecimento comunitário / FAQ público — tabela community_feedback e página /faq",
      descricao: "Implementação de sistema de perguntas frequentes curadas para o Motor. Tabela community_feedback no Supabase para coletar sugestões e perguntas dos usuários. Página pública /faq com 32 entradas iniciais cobrindo: propósito do Motor, os 4 índices estruturais (GT/CD/AUE/EI com fórmulas), classificação ontológica, fontes de dados, visão regional e limitações. Curadoria das respostas feita pelo pesquisador na área logada (GestaoPesquisa).",
      fonte: "Supabase community_feedback · GestaoPesquisa · páginas públicas",
      dificuldade: "FAQ precisa equilibrar resposta técnica correta com linguagem acessível — mesmo desafio da interface principal.",
      resolucao: "32 entradas iniciais com linguagem simples. Fluxo: usuário sugere via formulário → pesquisador curada e publica via GestaoPesquisa → aparece na /faq pública.",
    },
    {
      data: "2026-09-10",
      categoria: "decisao_arquitetura",
      titulo: "Primeira reunião com Prof. Eunice Liu (UTFPR/MCTI) — co-orientação e parceria institucional",
      descricao: "Primeira reunião com Prof. Eunice Liu, docente da UTFPR cedida ao Ministério de Ciência, Tecnologia e Inovação (MCTI), abrindo caminho para co-orientação do doutorado (PPGPP/UFPR, orientador principal: Prof. Shima). A professora avaliou o Motor da Inovação como ferramenta complementar ao Mapa Brasileiro de Inovação do MCTI, e propôs levar o projeto à Diretora de Inovação e Tecnologia do ministério. Carla (revisora técnica indicada pela Eunice) já havia revisado o repositório público e fará checagem inicial de segurança.",
      fonte: "Reunião presencial/remota — 10/09/2026 · UTFPR · MCTI · PPGPP/UFPR",
      dificuldade: "Tensão identificada entre dois arranjos institucionais possíveis: (1) Motor como componente dentro da governança do MCTI — cede autonomia sobre o artefato de tese; (2) Motor como fonte de dados que o MCTI consome via API — mantém autonomia da pesquisa. A diferença é crítica para uma tese de doutorado de autoria individual. Backend Python (Railway) estava fora do ar no mesmo dia, comprometendo a demonstração técnica para avaliação da Eunice.",
      resolucao: "Responsabilidades definidas na reunião: (1) enviar documentação detalhada de funcionalidades e objetivos do Motor ao MCTI; (2) implementar/documentar a API REST (o backend FastAPI no Railway já é uma API — precisa estar estável e documentada via Swagger/OpenAPI); (3) cadastrar o Motor como ferramenta voluntária no banco do MCTI. Próximo passo técnico imediato: corrigir ibge.py (erro de indentação que impede a inicialização do servidor inteiro), recolocar Railway no ar e revisar endpoints públicos antes de qualquer demonstração institucional.",
    },
    {
      data: "2026-09-10",
      categoria: "integracao_externa",
      titulo: "Metodologia do \"Mapa Brasileiro de Inovação\" — recebida da Prof. Eunice Liu",
      descricao: "Documento \"Cartografia da Inovação — Mapa Brasileiro de Inovação\", apresentado pela Prof. Eunice Liu (UTFPR, cedida ao MCTI) como convite de colaboração. Iniciativa do LIIA (Laboratório de Inovação em Inteligência Artificial), em parceria com Solvum, Porto Digital, HUB Goiás e SECTI-GO (piloto em Goiás). Metodologia baseada em Design Science Research, com framework MIT D-Lab, snowball sampling, OSINT, web scraping, scientometria e technometria, cruzando dados de desafios públicos via CPSI. Categoriza atores em 12 perfis de atuação (Agentes Geradores de Inovação, Instituições Financeiras, Organizações Internacionais, Instituições de Pesquisa e Ensino, Redes e Associações, Comunidade e Sociedade, Instituições de Apoio e Fomento, Serviços Especializados, Ambientes de Inovação, Órgãos e Labs de Governo, Infraestrutura de Apoio, Empreendimentos Inovadores). Propõe governança via Comitê Gestor Permanente com representação rotativa (NIA, LIIA, academia, setor privado, sociedade civil). Benchmarking contra Mapa de Startups da ABStartups e Crunchbase.",
      fonte: "Documento fornecido pela Prof. Eunice Liu (UTFPR/MCTI), em reunião de apresentação do projeto Mapa da Inovação",
      dificuldade: null,
      resolucao: "Décio avaliando formato de colaboração — se o Motor entra como componente de dado dentro da governança do Mapa Brasileiro de Inovação, ou como fonte externa consumida via API, mantendo autonomia da tese individual. Decisão ainda em aberto.",
      eh_achado_pesquisa: true,
      nota_desenvolvimento: "A proposta de governança do Mapa Brasileiro de Inovação (comitê multissetorial permanente) contrasta com a autoria individual do Motor da Inovação (projeto de tese, MIT license, sem comitê) — desenvolver como reflexão sobre dois modelos distintos de coordenação de infraestrutura de dados públicos: centralizado/institucional vs. individual/aberto. Relevante para o capítulo teórico sobre arranjos de governança em sistemas de inovação.",
    },
  ];

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("build_log")
      .select("*")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    const loaded = (data ?? []) as BuildLogEntry[];
    setEntries(loaded);

    // Seed automático se o diário estiver vazio
    if (loaded.length === 0) {
      const { data: inserted, error: seedErr } = await supabase
        .from("build_log")
        .insert(SEED_ENTRIES)
        .select();
      if (seedErr) {
        console.warn("Seed do diário falhou:", seedErr.message);
        return;
      }
      setEntries(((inserted ?? []) as BuildLogEntry[]).sort(
        (a, b) => b.data.localeCompare(a.data)
      ));
      toast.success(`${inserted?.length ?? 0} entradas carregadas no Diário de Construção.`);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addEntry = async (form: Omit<BuildLogEntry, "id">) => {
    const { data, error } = await supabase.from("build_log").insert(form).select().single();
    if (error) return toast.error(error.message);
    setEntries((p) => [data as BuildLogEntry, ...p]);
    toast.success("Entrada registrada no diário.");
  };

  const removeEntry = async (id: string) => {
    if (!confirm("Excluir esta entrada do diário?")) return;
    const { error } = await supabase.from("build_log").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setEntries((p) => p.filter((e) => e.id !== id));
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const M = 40;
      const W = doc.internal.pageSize.getWidth() - M * 2;
      const H = doc.internal.pageSize.getHeight();
      let y = M;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("Diário de Construção do Artefato — Motor da Inovação", M, y);
      y += 20;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(
        doc.splitTextToSize(
          "Registro metodológico de construção do artefato, organizado segundo a lógica da Design Science Research (DSR): cada entrada documenta a fonte de dado, a decisão de projeto, a dificuldade encontrada e a respectiva resolução ao longo dos ciclos de desenvolvimento e avaliação.",
          W,
        ),
        M,
        y,
      );
      y += 46;
      doc.setFontSize(8);
      doc.text(
        `Exportado em ${new Date().toLocaleDateString("pt-BR")} · ${sorted.length} entradas · PPGPP/UFPR`,
        M,
        y,
      );
      y += 18;

      const line = (label: string, value: string | null, bold = false) => {
        if (!value) return;
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(bold ? 10.5 : 9);
        const text = doc.splitTextToSize(label ? `${label}: ${value}` : value, W);
        const need = text.length * (bold ? 13 : 11);
        if (y + need > H - M) { doc.addPage(); y = M; }
        doc.text(text, M, y);
        y += need;
      };

      sorted.forEach((e, i) => {
        if (y > H - M - 60) { doc.addPage(); y = M; }
        y += 8;
        doc.setDrawColor(210);
        doc.line(M, y - 6, M + W, y - 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text(
          `${fmtDate(e.data)} · ${catLabel(e.categoria).toUpperCase()}${e.eh_achado_pesquisa ? " · ACHADO DE PESQUISA" : ""}`,
          M,
          y,
        );
        y += 13;
        line("", `${i + 1}. ${e.titulo}`, true);
        y += 2;
        line("Descrição", e.descricao);
        line("Fonte", e.fonte);
        line("Dificuldade", e.dificuldade);
        line("Resolução", e.resolucao);
        line("Desenvolver na tese", e.nota_desenvolvimento ?? null);

        y += 6;
      });

      doc.save("diario-de-construcao-motor-da-inovacao.pdf");
    } catch (err) {
      toast.error("Falha ao gerar o PDF.");
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const sorted = entries;
  const filtered = sorted
    .filter((e) => filter === "all" || e.categoria === filter)
    .filter((e) => !onlyAchados || e.eh_achado_pesquisa);
  const totalAchados = sorted.filter((e) => e.eh_achado_pesquisa).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={onlyAchados} onCheckedChange={(v) => setOnlyAchados(v === true)} />
            Mostrar só achados de pesquisa ({totalAchados})
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={exporting || sorted.length === 0}>
            <Download className="w-4 h-4" /> {exporting ? "Gerando…" : "Exportar para apêndice"}
          </Button>
          {canEdit && <EntryDialog onSubmit={addEntry} />}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        {filtered.length} de {sorted.length} entradas · registro auditável, leitura pública para fins de citação acadêmica.
      </p>

      <div className="relative pl-5 border-l border-border space-y-3">
        {filtered.map((e) => (
          <div key={e.id} className="relative">
            <span className={cn(
              "absolute -left-[26px] top-4 w-2.5 h-2.5 rounded-full ring-4 ring-background",
              e.eh_achado_pesquisa ? "bg-amber-500" : "bg-border",
            )} />
            <Card className={cn(e.eh_achado_pesquisa && "border-amber-500/60 shadow-[0_0_0_1px_hsl(38_92%_50%/0.25)]")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{fmtDate(e.data)}</span>
                      <Badge className={cn("text-[10px]", catStyle[e.categoria])}>{catLabel(e.categoria)}</Badge>
                      {e.eh_achado_pesquisa && (
                        <Badge className="text-[10px] gap-1 bg-amber-400 text-amber-950 border-transparent hover:bg-amber-400">
                          <Search className="w-3 h-3" /> Achado de Pesquisa
                        </Badge>
                      )}
                    </div>
                    <div className="font-semibold mt-1.5">{e.titulo}</div>
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeEntry(e.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {e.descricao && <p className="text-sm text-muted-foreground mt-2">{e.descricao}</p>}
                <div className="mt-3 space-y-1.5 text-xs">
                  {e.fonte && <Field label="Fonte" value={e.fonte} />}
                  {e.dificuldade && <Field label="Dificuldade" value={e.dificuldade} />}
                  {e.resolucao && <Field label="Resolução" value={e.resolucao} />}
                </div>
                {e.nota_desenvolvimento && (
                  <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                      Desenvolver na tese
                    </div>
                    <p className="text-xs mt-1 text-foreground/80">{e.nota_desenvolvimento}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-6">Nenhuma entrada com esses filtros.</p>
        )}
      </div>
    </div>
  );
}


function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-semibold text-muted-foreground shrink-0">{label}:</span>
      <span className="text-muted-foreground/90">{value}</span>
    </div>
  );
}

function EntryDialog({ onSubmit }: { onSubmit: (e: Omit<BuildLogEntry, "id">) => void }) {
  const [open, setOpen] = useState(false);
  const empty = {
    data: new Date().toISOString().slice(0, 10),
    categoria: "fonte_de_dado",
    titulo: "",
    descricao: "",
    fonte: "",
    dificuldade: "",
    resolucao: "",
    eh_achado_pesquisa: false,
    nota_desenvolvimento: "",
  };
  const [form, setForm] = useState(empty);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> Nova entrada</Button></DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova entrada no diário</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
          <div><Label>Fonte</Label><Input value={form.fonte} onChange={(e) => setForm({ ...form, fonte: e.target.value })} /></div>
          <div><Label>Dificuldade</Label><Textarea value={form.dificuldade} onChange={(e) => setForm({ ...form, dificuldade: e.target.value })} /></div>
          <div><Label>Resolução</Label><Textarea value={form.resolucao} onChange={(e) => setForm({ ...form, resolucao: e.target.value })} /></div>
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="achado"
              checked={form.eh_achado_pesquisa}
              onCheckedChange={(v) => setForm({ ...form, eh_achado_pesquisa: v === true })}
            />
            <Label htmlFor="achado" className="cursor-pointer">Marcar como achado de pesquisa</Label>
          </div>
          {form.eh_achado_pesquisa && (
            <div>
              <Label>Desenvolver na tese</Label>
              <Textarea
                value={form.nota_desenvolvimento}
                placeholder="O que precisa ser desenvolvido/explorado na tese a partir desse achado."
                onChange={(e) => setForm({ ...form, nota_desenvolvimento: e.target.value })}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (!form.titulo || !form.data) return toast.error("Data e título são obrigatórios.");
              onSubmit({
                data: form.data,
                categoria: form.categoria,
                titulo: form.titulo,
                descricao: form.descricao || null,
                fonte: form.fonte || null,
                dificuldade: form.dificuldade || null,
                resolucao: form.resolucao || null,
                eh_achado_pesquisa: form.eh_achado_pesquisa,
                nota_desenvolvimento: form.eh_achado_pesquisa ? (form.nota_desenvolvimento || null) : null,
              });
              setOpen(false);
              setForm(empty);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

