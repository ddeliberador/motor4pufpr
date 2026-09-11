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
import { Plus, Download, Trash2 } from "lucide-react";
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
};

const CATEGORIAS = [
  { value: "fonte_de_dado", label: "Fonte de dado" },
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
        doc.text(`${fmtDate(e.data)} · ${catLabel(e.categoria).toUpperCase()}`, M, y);
        y += 13;
        line("", `${i + 1}. ${e.titulo}`, true);
        y += 2;
        line("Descrição", e.descricao);
        line("Fonte", e.fonte);
        line("Dificuldade", e.dificuldade);
        line("Resolução", e.resolucao);
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
  const filtered = filter === "all" ? sorted : sorted.filter((e) => e.categoria === filter);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[240px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
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
            <span className="absolute -left-[26px] top-4 w-2.5 h-2.5 rounded-full bg-border ring-4 ring-background" />
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{fmtDate(e.data)}</span>
                      <Badge className={cn("text-[10px]", catStyle[e.categoria])}>{catLabel(e.categoria)}</Badge>
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
              </CardContent>
            </Card>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-6">Nenhuma entrada nesta categoria.</p>
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
