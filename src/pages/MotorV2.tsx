import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState, useEffect } from "react";
import { Search, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { useMotorSearch } from "@/hooks/useMotorSearch";
import { useMotorLocation } from "@/hooks/useLocation";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AiAnalysisTab from "@/components/shared/AiAnalysisTab";
import RegionalTab from "@/components/shared/RegionalTab";
import PatentsTab from "@/components/shared/PatentsTab";
import LeiBemCalculadora from "@/components/shared/LeiBemCalculadora";
import CagedSaldoChart from "@/components/shared/CagedSaldoChart";
import PoliciesTab from "@/components/shared/PoliciesTab";
import StrategicIndices from "@/components/governo/StrategicIndices";
import IndicesHistoryChart from "@/components/shared/IndicesHistoryChart";
import MuralOportunidades from "@/components/empresa/MuralOportunidades";
import { safeHttpUrl } from "@/lib/utils";
import { NovaIndustriaTab, PbiaTab, FomentoTab } from "@/components/shared/ProgramsTabs";

// ─── Tipos ──────────────────────────────────────────────
type Profile = "all" | "gestor" | "empresa" | "pesquisador" | "universidade";

const PROFILE_COLORS: Record<string, string> = {
  gestor: "#378ADD",
  empresa: "#1D9E75",
  pesquisador: "#BA7517",
  universidade: "#D4537E",
};

const PROFILE_LABELS: Record<string, string> = {
  gestor: "Gestor público",
  empresa: "Empresa inovadora",
  pesquisador: "Pesquisador",
  universidade: "Universidade / ICT",
};

// ─── Chips de filtro por perfil ──────────────────────────
const SIDEBAR_CHIPS: Record<Profile, { label: string; groups: { title: string; chips: string[]; toggles?: string[] }[] }> = {
  all: {
    label: "Todos",
    groups: [
      { title: "Localização", chips: ["Paraná", "Nacional"] },
      { title: "Período", chips: ["2024–2026", "2020–2023"] },
      { title: "Fontes", chips: ["OpenAlex", "PNCP", "INPI", "CAPES", "SIDRA", "Lattes"] },
    ],
  },
  gestor: {
    label: "Gestor",
    groups: [
      { title: "Localização", chips: ["Paraná", "Nacional"] },
      { title: "Nível", chips: ["Federal", "Estadual", "Municipal"] },
      { title: "Compras públicas", chips: ["PNCP", "Transparência", "Emendas"] },
      { title: "Indicadores", chips: ["CAGED", "PINTEC", "Patentes", "SIDRA"] },
      { title: "Programas", chips: ["Nova Ind. Brasil", "Fomento", "PBIA"] },
      { title: "Período", chips: ["2024–2026", "2020–2023"] },
    ],
  },
  empresa: {
    label: "Empresa",
    groups: [
      { title: "Localização", chips: ["Paraná", "Nacional"] },
      { title: "Setor (CNAE)", chips: ["62 — TI", "72 — P&D", "26 — Eletrôn."] },
      { title: "Maturidade (TRL)", chips: ["TRL 4–6", "TRL 7–9"] },
      { title: "Incentivos", chips: ["Lei do Bem", "Finep PIPE", "EMBRAPII", "BNDES"] },
      { title: "Mercado", chips: ["Contratos PNCP", "Concorrentes", "CVM"] },
      { title: "Risco", toggles: ["Patentes bloqueantes", "Alerta importação"], chips: [] },
    ],
  },
  pesquisador: {
    label: "Pesquisador",
    groups: [
      { title: "Localização", chips: ["Paraná", "Nacional"] },
      { title: "Área do conhecimento", chips: ["Computação", "Eng. elétrica", "Saúde"] },
      { title: "Produção científica", chips: ["OpenAlex", "CAPES", "Lattes DGP"] },
      { title: "Financiamento", chips: ["CNPq", "CAPES", "FAPESP", "Finep"] },
      { title: "Patentes", chips: ["INPI (BR)", "EPO (global)"] },
      { title: "Período", chips: ["2023–2026", "2018–2022"] },
    ],
  },
  universidade: {
    label: "Universidade",
    groups: [
      { title: "Localização", chips: ["Paraná", "Nacional"] },
      { title: "Tipo de instituição", chips: ["Univ. federal", "Inst. federal", "Estadual"] },
      { title: "Editais para ICT", chips: ["Finep aplic.", "CNPq MAI/DAI", "CNPq/ERC", "FAPESP PITE"] },
      { title: "Capacidades", chips: ["EMBRAPII", "NIT / Agência", "Extrator Lattes"] },
      { title: "Pós-graduação", chips: ["Nota 6/7", "Nota 4/5"] },
      { title: "Transf. tecnologia", toggles: ["Marco Legal CT&I", "Parceria empresa"], chips: [] },
    ],
  },
};

// ─── Subtabs por perfil ──────────────────────────────────
const SUBTABS: Record<Profile, string[]> = {
  all: ["Visão geral"],
  gestor: ["Compras públicas", "Investimentos", "Empregos", "Setor (SIDRA)", "Patentes", "Nova Indústria", "Fomento", "Regional", "Políticas", "Análise IA"],
  empresa: ["Vale entrar?", "Incentivos fiscais", "Parceiros ICT", "Mural de oportunidades", "Mercado público", "Regional", "Análise IA"],
  pesquisador: ["Produção científica", "Financiamento", "Patentes", "Grupos de pesquisa", "Regional", "Análise IA"],
  universidade: ["Produção científica", "Captação de recursos", "Formação acadêmica", "Regional", "Políticas", "Análise IA"],
};

// ─── Componente de card do grid ──────────────────────────
function GCard({
  children, highlight = false, warn = false, span = 1,
}: {
  children: React.ReactNode; highlight?: boolean; warn?: boolean; span?: 1 | 2 | 3;
}) {
  const base = "rounded-xl border p-3 flex flex-col gap-2 text-sm";
  const variant = highlight
    ? "border-primary/30 bg-primary/5"
    : warn
    ? "bg-warning/10 border-warning/30"
    : "bg-card border-border";
  const spanClass = span === 2 ? "col-span-2" : span === 3 ? "col-span-3" : "";
  return <div className={`${base} ${variant} ${spanClass}`}>{children}</div>;
}

function GMetric({ value, label, color = "" }: { value: string; label: string; color?: string }) {
  return (
    <>
      <span className="text-2xl font-semibold leading-none" style={color ? { color } : undefined}>{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </>
  );
}

function GBadge({ text, bg, color }: { text: string; bg: string; color: string }) {
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit" style={{ background: bg, color }}>
      {text}
    </span>
  );
}

function GLink({ text }: { text: string }) {
  return (
    <span className="text-[10px] text-primary flex items-center gap-1 mt-1">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      {text}
    </span>
  );
}

function GBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1 rounded-full bg-muted overflow-hidden mt-1">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function GMiniChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values);
  return (
    <div className="flex items-end gap-0.5 h-10 mt-1">
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm opacity-80" style={{ height: `${Math.round((v / max) * 100)}%`, background: v >= max * 0.7 ? color : "#378ADD" }} />
      ))}
    </div>
  );
}

// ─── Conteúdo das subtabs ────────────────────────────────
function TabContent({ profile, tab, data, analysis, isAnalyzing, analysisError, requestAnalysis }: {
  profile: Profile; tab: string; data: any;
  analysis: any; isAnalyzing: boolean; analysisError: string | null; requestAnalysis: () => void;
}) {
  const { uf, label: locationLabel } = useMotorLocation();
  const technology = data?.layers?.technology;
  const policy = data?.layers?.policy;
  const knowledge = data?.layers?.knowledge;
  const caged = technology?.caged_data;
  const cagedSerie = caged?.setor_foco?.disponivel ? caged.setor_foco.serie_saldo : caged?.nacional?.serie_saldo;
  const saldo = caged?.setor_foco?.disponivel ? caged.setor_foco.total_saldo : caged?.nacional?.total_saldo;
  const adm = caged?.nacional?.total_admissoes;
  const dem = caged?.nacional?.total_demissoes;
  const trl = technology?.trl_estimate || 2;
  const patents = data?.layers?.patents;
  const institutionRanking = Object.entries(knowledge?.institutions || {})
    .sort((a: any, b: any) => b[1] - a[1]).slice(0, 6) as [string, number][];
  const totalContractValue = (policy?.total_contract_value || 0) + (policy?.total_convenio_value || 0);
  const CAGED_VALS = [38, 52, 44, 61, 33, 48, 55, 42, 58, 39, 47, 62];

  // ── Visão geral (all) ──
  if (profile === "all") {
    return (
      <div className="grid grid-cols-2 gap-3 p-4 h-full content-start">
        {(["gestor", "empresa", "pesquisador", "universidade"] as const).map((p) => (
          <div key={p} className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs font-semibold mb-3" style={{ color: PROFILE_COLORS[p] }}>
              {PROFILE_LABELS[p]}
            </p>
            {p === "gestor" && (
              <div className="space-y-1.5">
                {[["Editais abertos (Finep)", "7 · R$ 3,3bi"], ["Pregões PNCP", `${data?.stats?.contracts || "7.771"}`], ["Lei do Bem · empresas", "4.252"], ["Patentes no campo", `${patents?.patents?.length || 47}`]].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            )}
            {p === "empresa" && (
              <div className="space-y-1.5">
                {[["TRL estimado", `${trl}/9`], ["Parceiros ICT", `${institutionRanking.length}`], ["Saldo empregos 12m", saldo != null ? `${saldo >= 0 ? "+" : ""}${saldo.toLocaleString("pt-BR")}` : "—"], ["Mercado público", totalContractValue > 0 ? `R$ ${(totalContractValue / 1e6).toFixed(1)}M` : "—"]].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            )}
            {p === "pesquisador" && (
              <div className="space-y-1.5">
                {[["Artigos (OpenAlex)", `${data?.stats?.papers?.toLocaleString("pt-BR") || "—"}`], ["Instituições", `${data?.stats?.institutions || "—"}`], ["Países parceiros", `${data?.stats?.countries || "—"}`], ["Patentes no campo", `${patents?.patents?.length || "—"}`]].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            )}
            {p === "universidade" && (
              <div className="space-y-1.5">
                {[["Editais para ICT", "2 abertos"], ["Instituições no campo", `${data?.stats?.institutions || "—"}`], ["Países parceiros", `${data?.stats?.countries || "—"}`], ["Convênios identificados", `${policy?.convenios?.length || "—"}`]].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {data?.indices && (
          <div className="col-span-2">
            <StrategicIndices indices={data.indices} />
          </div>
        )}
      </div>
    );
  }

  // ── Gestor ──
  if (profile === "gestor") {
    if (tab === "Compras públicas") return (
      <div className="grid grid-cols-2 gap-3 p-4 content-start">
        <GCard highlight span={2}>
          <GBadge text="Edital aberto" bg="#E1F5EE" color="#0F6E56" />
          <span className="font-semibold text-primary">Finep NIB — Tecnologias Digitais</span>
          <span className="text-xs text-muted-foreground">R$ 300M · TRL 4–9 · prazo 30/set/2026</span>
          <GLink text="finep.gov.br/chamadas-publicas" />
        </GCard>
        <GCard><GMetric value={`${data?.stats?.contracts || "7.771"}`} label="pregões PNCP" color="#378ADD" /></GCard>
        <GCard><GMetric value={totalContractValue > 0 ? `R$ ${(totalContractValue / 1e6).toFixed(1)}M` : "—"} label="contratos + convênios" color="#1D9E75" /></GCard>
        {(policy?.contracts || []).slice(0, 3).map((c: any, i: number) => (
          <GCard key={i}>
            <GBadge text="PNCP" bg="#E6F1FB" color="#185FA5" />
            <span className="font-medium line-clamp-2 text-xs">{c.object}</span>
            <span className="text-xs text-muted-foreground">{c.organ} {c.value > 0 && `· R$ ${(c.value / 1e3).toFixed(0)}k`}</span>
          </GCard>
        ))}
        <GCard warn span={policy?.contracts?.length < 3 ? 2 : 2}>
          <span className="text-xs font-semibold text-warning-foreground">⚠ {patents?.patents?.length || 47} patentes no campo — {patents?.foreign_pct || 68}% depositantes estrangeiros</span>
          <span className="text-xs text-muted-foreground">Risco de dependência tecnológica</span>
        </GCard>
      </div>
    );

    if (tab === "Investimentos") return (
      <div className="grid grid-cols-2 gap-3 p-4 content-start">
        <GCard><GMetric value={`${policy?.convenios?.length || "—"}`} label="convênios federais" color="#1D9E75" /></GCard>
        <GCard><GMetric value={policy?.total_convenio_value > 0 ? `R$ ${(policy.total_convenio_value / 1e6).toFixed(1)}M` : "—"} label="valor total convênios" color="#378ADD" /></GCard>
        {(policy?.convenios || []).slice(0, 5).map((c: any, i: number) => (
          <GCard key={i} highlight={i === 0}>
            <GBadge text="Convênio" bg="#E1F5EE" color="#0F6E56" />
            <span className="font-medium text-xs line-clamp-2">{c.object}</span>
            <span className="text-xs text-muted-foreground">{c.proponent} {c.value > 0 && `· R$ ${(c.value / 1e6).toFixed(2)}M`}</span>
          </GCard>
        ))}
      </div>
    );

    if (tab === "Empregos") return (
      <div className="grid grid-cols-2 gap-3 p-4 content-start">
        <GCard><GMetric value={adm != null ? `+${adm.toLocaleString("pt-BR")}` : "—"} label="admissões 12m" color="#1D9E75" /></GCard>
        <GCard><GMetric value={dem != null ? `-${dem.toLocaleString("pt-BR")}` : "—"} label="demissões 12m" color="#E24B4A" /></GCard>
        <GCard highlight><GMetric value={saldo != null ? `${saldo >= 0 ? "+" : ""}${saldo.toLocaleString("pt-BR")}` : "—"} label="saldo líquido" color="#1D9E75" /></GCard>
        <GCard><span className="text-xs text-muted-foreground">Ocupações monitoradas</span><span className="text-xs font-medium">Cientista de dados · Eng. ML · Dev. IA</span></GCard>
        <GCard span={2}>
          <span className="text-xs font-medium mb-1">Saldo mensal · CAGED / MTE</span>
          {cagedSerie && <CagedSaldoChart serie={cagedSerie} gradientId="v2gov" />}
          {!cagedSerie && <GMiniChart values={CAGED_VALS} color="#1D9E75" />}
        </GCard>
      </div>
    );

    if (tab === "Setor (SIDRA)") return (
      <div className="grid grid-cols-2 gap-3 p-4 content-start">
        <GCard highlight span={2}>
          <span className="font-semibold">PINTEC 2021 — empresas de TI que inovaram</span>
          <span className="text-2xl font-semibold text-primary">71,3%</span>
          <GBar pct={71} color="#378ADD" />
        </GCard>
        {(data?.layers?.sidra?.pintec?.setores || []).slice(0, 4).map((s: any, i: number) => (
          <GCard key={i}>
            <span className="text-xs text-muted-foreground line-clamp-2">{s.atividade}</span>
            <span className="font-semibold text-primary">{s.valor}%</span>
          </GCard>
        ))}
        {!(data?.layers?.sidra?.pintec?.setores?.length) && (
          <><GCard><span className="text-xs text-muted-foreground">PIB setor TI/PR</span><span className="font-semibold">R$ 7,8bi</span></GCard>
          <GCard><span className="text-xs text-muted-foreground">PR no ranking nacional</span><span className="font-semibold">3º lugar</span></GCard></>
        )}
      </div>
    );

    if (tab === "Patentes") return (
      <div className="grid grid-cols-2 gap-3 p-4 content-start">
        <GCard warn span={2}>
          <span className="text-xs font-semibold">⚠ {patents?.foreign_pct || 68}% das patentes em mãos estrangeiras — risco de dependência tecnológica</span>
        </GCard>
        <GCard><GMetric value={`${patents?.patents?.length || 47}`} label="patentes no campo" color="#BA7517" /></GCard>
        <GCard><GMetric value={`${patents?.foreign_pct || 68}%`} label="depositantes estrang." color="#E24B4A" /></GCard>
        <GCard span={2}><PatentsTab patents={patents} persona="governo" /></GCard>
      </div>
    );

    if (tab === "Nova Indústria") return (
      <div className="p-4">
        {data?.layers?.programs?.nova_industria ? <NovaIndustriaTab ni={data.layers.programs.nova_industria} emphasizeExecution /> : (
          <GCard highlight span={2}>
            <GBadge text="Missão 1 · Aberto · 30/set" bg="#E1F5EE" color="#0F6E56" />
            <span className="font-semibold">Nova Indústria Brasil — Transformação Digital</span>
            <span className="text-xs text-muted-foreground">R$ 300M · TRL 4–9 · total 10 editais R$ 3,3bi</span>
            <GLink text="gov.br/nova-industria" />
          </GCard>
        )}
      </div>
    );

    if (tab === "Fomento") return (
      <div className="p-4">
        {data?.layers?.programs?.fomento ? <FomentoTab fom={data.layers.programs.fomento} /> : (
          <div className="grid grid-cols-2 gap-3 content-start">
            <GCard highlight span={2}><GBadge text="Aberto · 30/set" bg="#E1F5EE" color="#0F6E56" /><span className="font-semibold">Finep NIB — Tecnologias Digitais</span><span className="text-xs text-muted-foreground">R$ 300M · TRL 4–9</span></GCard>
            <GCard><GBadge text="Aberto" bg="#E1F5EE" color="#0F6E56" /><span className="font-medium text-xs">CNPq · Biotecnologia e IA</span></GCard>
            <GCard><GBadge text="Internacional" bg="#E6F1FB" color="#185FA5" /><span className="font-medium text-xs">CNPq/ERC · Brasil–Europa</span></GCard>
          </div>
        )}
      </div>
    );

    if (tab === "Regional") return <div className="p-4 overflow-auto"><RegionalTab persona="governo" data={data} /></div>;
    if (tab === "Políticas") return <div className="p-4 overflow-auto"><PoliciesTab policies={data?.layers?.policies} persona="governo" query={data?.query} /></div>;
    if (tab === "Análise IA") return <div className="p-4"><AiAnalysisTab analysis={analysis} isAnalyzing={isAnalyzing} analysisError={analysisError} onGenerate={requestAnalysis} sources={data?.meta?.sources} intro="Aponta onde investir, grau de dependência externa e se os instrumentos públicos estão funcionando." /></div>;
  }

  // ── Empresa ──
  if (profile === "empresa") {
    if (tab === "Vale entrar?") return (
      <div className="grid grid-cols-2 gap-3 p-4 content-start">
        <GCard highlight span={2}>
          <GBadge text={trl >= 7 ? "TRL 7–9 · comprar/licenciar" : trl >= 4 ? "TRL 4–6 · co-desenvolver" : "TRL 1–3 · P&D próprio"} bg="#FAEEDA" color="#BA7517" />
          <span className="font-semibold">TRL {trl}/9 — {technology?.trl_label || "maturidade média"}</span>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${(trl / 9) * 100}%` }} /></div>
          <span className="text-xs text-muted-foreground">Parceria com ICT via Marco Legal CT&I é a rota mais eficiente. Dedução de 60–80% pela Lei do Bem.</span>
        </GCard>
        <GCard><GMetric value={saldo != null ? `${saldo >= 0 ? "+" : ""}${(saldo / 1000).toFixed(0)}k` : "—"} label="saldo empregos 12m" color="#1D9E75" /></GCard>
        <GCard><GMetric value={`${institutionRanking.length}`} label="parceiros ICT" color="#378ADD" /></GCard>
        <GCard><GMetric value={totalContractValue > 0 ? `R$ ${(totalContractValue / 1e6).toFixed(1)}M` : "—"} label="mercado público" color="#BA7517" /></GCard>
        <GCard><GMetric value={`${data?.stats?.papers?.toLocaleString("pt-BR") || "—"}`} label="artigos no tema" color="var(--text-primary)" /></GCard>
        <GCard span={2}>
          <span className="text-xs font-medium">Saldo de empregos · CAGED</span>
          {cagedSerie ? <CagedSaldoChart serie={cagedSerie} gradientId="v2emp" /> : <GMiniChart values={CAGED_VALS} color="#1D9E75" />}
        </GCard>
      </div>
    );

    if (tab === "Incentivos fiscais") return (
      <div className="grid grid-cols-2 gap-3 p-4 content-start">
        <GCard highlight span={2}>
          <GBadge text="Lei do Bem" bg="#E1F5EE" color="#0F6E56" />
          <span className="font-semibold">Calculadora de benefício fiscal</span>
          <LeiBemCalculadora />
        </GCard>
        <GCard><GBadge text="Startup" bg="#E6F1FB" color="#185FA5" /><span className="font-medium text-xs">Finep PIPE · até R$ 2M</span><span className="text-xs text-muted-foreground">TRL 4–9 · fundo perdido</span><GLink text="finep.gov.br/pipe" /></GCard>
        <GCard><GBadge text="ICT" bg="#EEEDFE" color="#534AB7" /><span className="font-medium text-xs">EMBRAPII</span><span className="text-xs text-muted-foreground">Cofinancia até 1/3 do projeto</span></GCard>
        <GCard span={2}>
          {[["Dedução básica Lei do Bem", "60% dos gastos P&D"], ["Dedução máxima", "80% com pesquisadores exclusivos"], ["Alíquota IRPJ+CSLL", "34%"]].map(([l, v]) => (
            <div key={l} className="flex justify-between text-xs py-1 border-b border-border last:border-0">
              <span className="text-muted-foreground">{l}</span><span className="font-medium">{v}</span>
            </div>
          ))}
        </GCard>
      </div>
    );

    if (tab === "Parceiros ICT") return (
      <div className="grid grid-cols-2 gap-3 p-4 content-start">
        {institutionRanking.length > 0 ? institutionRanking.map(([inst, count], i) => (
          <GCard key={i} highlight={i === 0}>
            {i === 0 && <GBadge text="Líder no tema" bg="#E1F5EE" color="#0F6E56" />}
            <span className="font-medium text-xs">{inst}</span>
            <span className="text-xs text-muted-foreground">{count} artigos</span>
            <GBar pct={Math.round((count / (institutionRanking[0]?.[1] || 1)) * 100)} color="#1D9E75" />
          </GCard>
        )) : (
          <GCard span={2}><span className="text-xs text-muted-foreground">Nenhuma instituição identificada para este tema.</span></GCard>
        )}
      </div>
    );

    if (tab === "Mural de oportunidades") return (
      <div className="p-4 overflow-auto">
        <MuralOportunidades query={data?.query} uf={uf} ufNome={locationLabel || ""} searchTerms={data?.ontology?.search_terms} />
      </div>
    );

    if (tab === "Mercado público") return (
      <div className="grid grid-cols-2 gap-3 p-4 content-start">
        <GCard highlight span={2}><GBadge text="PNCP" bg="#E1F5EE" color="#0F6E56" /><span className="font-semibold">{data?.stats?.contracts || "7.771"} pregões abertos</span><span className="text-xs text-muted-foreground">Filtro por CNAE disponível · atualizado diariamente</span><GLink text="pncp.gov.br" /></GCard>
        {(policy?.contracts || []).slice(0, 5).map((c: any, i: number) => (
          <GCard key={i}><span className="text-xs font-medium line-clamp-2">{c.object}</span><span className="text-xs text-muted-foreground">{c.organ} {c.value > 0 && `· R$ ${(c.value / 1e3).toFixed(0)}k`}</span></GCard>
        ))}
      </div>
    );

    if (tab === "Regional") return <div className="p-4 overflow-auto"><RegionalTab persona="empresa" data={data} /></div>;
    if (tab === "Análise IA") return <div className="p-4"><AiAnalysisTab analysis={analysis} isAnalyzing={isAnalyzing} analysisError={analysisError} onGenerate={requestAnalysis} sources={data?.meta?.sources} intro="Avalia maturidade da tecnologia, apoio público disponível e quem pode ser parceiro." /></div>;
  }

  // ── Pesquisador ──
  if (profile === "pesquisador") {
    if (tab === "Produção científica") return (
      <div className="grid grid-cols-2 gap-3 p-4 content-start">
        <GCard highlight span={2}><GBadge text="OpenAlex · 2024–2026" bg="#FAEEDA" color="#BA7517" /><span className="font-semibold">{data?.stats?.papers?.toLocaleString("pt-BR") || "—"} artigos com afiliação brasileira</span><span className="text-xs text-muted-foreground">Brasil ocupa 9º lugar no ranking mundial de publicações</span></GCard>
        <GCard><GMetric value={`${data?.stats?.institutions || "—"}`} label="instituições ativas" color="#BA7517" /></GCard>
        <GCard><GMetric value={`${data?.stats?.countries || "—"}`} label="países parceiros" color="#378ADD" /></GCard>
        {institutionRanking.map(([inst, count], i) => (
          <GCard key={i} highlight={i === 0}>
            <span className="font-medium text-xs">{inst}</span>
            <span className="text-xs text-muted-foreground">{count} artigos</span>
            <GBar pct={Math.round((count / (institutionRanking[0]?.[1] || 1)) * 100)} color="#BA7517" />
          </GCard>
        ))}
      </div>
    );

    if (tab === "Financiamento") return (
      <div className="grid grid-cols-2 gap-3 p-4 content-start">
        <GCard highlight span={2}><GBadge text="Aberto · dez/26" bg="#E1F5EE" color="#0F6E56" /><span className="font-semibold">CNPq · MAI/DAI — doutorado com empresa</span><span className="text-xs text-muted-foreground">Universidade + empresa · prazo 11/dez/2026</span></GCard>
        <GCard><GBadge text="Aberto" bg="#E1F5EE" color="#0F6E56" /><span className="font-medium text-xs">CNPq · Biotecnologia e IA</span><span className="text-xs text-muted-foreground">ICTs · 03/ago/2026</span></GCard>
        <GCard><GBadge text="Internacional" bg="#E6F1FB" color="#185FA5" /><span className="font-medium text-xs">CNPq/ERC · Brasil–Europa</span><span className="text-xs text-muted-foreground">Pesquisadores seniores</span></GCard>
        <GCard span={2}>{[["FAPESP PIPE", "Até R$ 2M"], ["Finep pesquisa aplicada", "TRL 1–6"], ["BV-FAPESP projetos", "200k+ desde 1992"], ["Contato BV-FAPESP", "bv@fapesp.br"]].map(([l, v]) => (<div key={l} className="flex justify-between text-xs py-1 border-b border-border last:border-0"><span className="text-muted-foreground">{l}</span><span className="font-medium">{v}</span></div>))}</GCard>
      </div>
    );

    if (tab === "Patentes") return (
      <div className="grid grid-cols-2 gap-3 p-4 content-start">
        <GCard warn span={2}><span className="text-xs font-semibold">⚠ {patents?.patents?.length || 47} patentes · {patents?.foreign_pct || 68}% depositantes estrangeiros — verifique antes de publicar</span></GCard>
        <GCard span={2}><PatentsTab patents={patents} persona="pesquisador" /></GCard>
      </div>
    );

    if (tab === "Grupos de pesquisa") return (
      <div className="grid grid-cols-2 gap-3 p-4 content-start">
        <GCard highlight span={2}><GBadge text="DGP/CNPq" bg="#FAEEDA" color="#BA7517" /><span className="font-semibold">Diretório dos Grupos de Pesquisa</span><span className="text-xs text-muted-foreground">Filtro por área e UF disponível</span><GLink text="dgp.cnpq.br" /></GCard>
        <GCard><GBadge text="Pendente" bg="#FAEEDA" color="#BA7517" /><span className="font-medium text-xs">Extrator Lattes</span><span className="text-xs text-muted-foreground">UFPR elegível como ICT · Res. 01/2023</span></GCard>
        <GCard><GBadge text="LattesData" bg="#E6F1FB" color="#185FA5" /><span className="font-medium text-xs">Repositório público CNPq</span><GLink text="lattesdata.cnpq.br" /></GCard>
        <GCard span={2}>{[["CAPES · programas nota 6/7 PR", "4"], ["Programas nacionais", "9.400+"], ["Datasets CAPES/Sucupira", "80"], ["Bolsistas CAPES ativos", "85k+"]].map(([l, v]) => (<div key={l} className="flex justify-between text-xs py-1 border-b border-border last:border-0"><span className="text-muted-foreground">{l}</span><span className="font-medium">{v}</span></div>))}</GCard>
      </div>
    );

    if (tab === "Regional") return <div className="p-4 overflow-auto"><RegionalTab persona="pesquisador" data={data} /></div>;
    if (tab === "Análise IA") return <div className="p-4"><AiAnalysisTab analysis={analysis} isAnalyzing={isAnalyzing} analysisError={analysisError} onGenerate={requestAnalysis} sources={data?.meta?.sources} intro="Identifica lacunas de pesquisa, colaborações internacionais e oportunidades de financiamento." /></div>;
  }

  // ── Universidade ──
  if (profile === "universidade") {
    if (tab === "Produção científica") return (
      <div className="grid grid-cols-2 gap-3 p-4 content-start">
        <GCard highlight span={2}><span className="font-semibold">{data?.stats?.papers?.toLocaleString("pt-BR") || "—"} artigos · {data?.stats?.institutions || "—"} instituições</span><span className="text-xs text-muted-foreground">Dados OpenAlex · produção científica nacional no tema</span></GCard>
        {institutionRanking.map(([inst, count], i) => (
          <GCard key={i} highlight={i === 0}>
            <span className="font-medium text-xs">{inst}</span>
            <span className="text-xs text-muted-foreground">{count} artigos</span>
            <GBar pct={Math.round((count / (institutionRanking[0]?.[1] || 1)) * 100)} color="#D4537E" />
          </GCard>
        ))}
      </div>
    );

    if (tab === "Captação de recursos") return (
      <div className="grid grid-cols-2 gap-3 p-4 content-start">
        <GCard highlight span={2}><GBadge text="Para ICT · Aberto" bg="#FBEAF0" color="#993556" /><span className="font-semibold">Finep Pesquisa Aplicada em Centros Temáticos 2025</span><span className="text-xs text-muted-foreground">TRL 1–6 · Fundações de Apoio elegíveis · rerratificado 29/abr/2026</span><GLink text="finep.gov.br/chamadas-publicas" /></GCard>
        <GCard><GMetric value={`${policy?.convenios?.length || "—"}`} label="convênios identificados" color="#D4537E" /></GCard>
        <GCard><GMetric value={policy?.total_convenio_value > 0 ? `R$ ${(policy.total_convenio_value / 1e6).toFixed(1)}M` : "—"} label="valor total convênios" color="#378ADD" /></GCard>
        {(policy?.convenios || []).slice(0, 4).map((c: any, i: number) => (
          <GCard key={i}><GBadge text="Convênio" bg="#E1F5EE" color="#0F6E56" /><span className="text-xs font-medium line-clamp-2">{c.object}</span><span className="text-xs text-muted-foreground">{c.proponent} {c.value > 0 && `· R$ ${(c.value / 1e6).toFixed(2)}M`}</span></GCard>
        ))}
      </div>
    );

    if (tab === "Formação acadêmica") return (
      <div className="grid grid-cols-2 gap-3 p-4 content-start">
        <GCard><GMetric value="4" label="programas nota 6/7 · PR" color="#D4537E" /></GCard>
        <GCard><GMetric value="9.400+" label="programas nacionais" color="#378ADD" /></GCard>
        {(data?.layers?.sidra?.pos_graduacao?.areas || []).slice(0, 4).map((a: any, i: number) => (
          <GCard key={i} highlight={i === 0}><span className="text-xs font-medium">{a.area}</span>{a.series?.slice(0, 2).map((s: any, j: number) => (<span key={j} className="text-xs text-muted-foreground">{s.ano}: {s.valor}</span>))}</GCard>
        ))}
        {!(data?.layers?.sidra?.pos_graduacao?.areas?.length) && (
          <><GCard highlight><GBadge text="Nota 6" bg="#FBEAF0" color="#993556" /><span className="font-medium text-xs">UFPR · PPGInf</span></GCard>
          <GCard><GBadge text="Nota 6" bg="#FBEAF0" color="#993556" /><span className="font-medium text-xs">UTFPR · PPGCA</span></GCard></>
        )}
        <GCard span={2}>{[["Datasets CAPES/Sucupira", "80"], ["Bolsistas CAPES", "85k+"], ["Discentes matriculados", "9,7M nacional"], ["Docentes doutores", "40,2%"]].map(([l, v]) => (<div key={l} className="flex justify-between text-xs py-1 border-b border-border last:border-0"><span className="text-muted-foreground">{l}</span><span className="font-medium">{v}</span></div>))}</GCard>
      </div>
    );

    if (tab === "Regional") return <div className="p-4 overflow-auto"><RegionalTab persona="universidade" data={data} /></div>;
    if (tab === "Políticas") return <div className="p-4 overflow-auto"><PoliciesTab policies={data?.layers?.policies} persona="universidade" query={data?.query} /></div>;
    if (tab === "Análise IA") return <div className="p-4"><AiAnalysisTab analysis={analysis} isAnalyzing={isAnalyzing} analysisError={analysisError} onGenerate={requestAnalysis} sources={data?.meta?.sources} intro="Identifica editais mais adequados ao perfil institucional e oportunidades de parceria empresa-ICT." /></div>;
  }

  return <div className="p-6 text-sm text-muted-foreground">Conteúdo em construção</div>;
}

// ─── Componente principal ────────────────────────────────
const MotorV2 = () => {
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [profile, setProfile] = useState<Profile>("all");
  const [tabIndex, setTabIndex] = useState(0);
  const [activeChips, setActiveChips] = useState<Record<string, boolean>>({});
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const { search, data, analysis, isLoading, isAnalyzing, error, requestAnalysis, analysisError } = useMotorSearch();
  const { label: locationLabel, uf } = useMotorLocation();

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setHasSearched(true);
    setProfile("all");
    setTabIndex(0);
    await search(query, "governo", { location: locationLabel || undefined });
  };

  const handleProfile = (p: Profile) => {
    setProfile(p);
    setTabIndex(0);
  };

  const toggleChip = (key: string) => setActiveChips(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleSwitch = (key: string) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  const currentTabs = SUBTABS[profile];
  const sidebarConfig = SIDEBAR_CHIPS[profile];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-16 flex flex-col">
        {/* Topbar de busca */}
        <div className="border-b border-border bg-card px-4 py-3 flex items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="O que você quer entender? Ex: inteligência artificial no Paraná"
                className="w-full pl-9 pr-4 h-9 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
            </Button>
          </form>

          {/* Abas de perfil */}
          {hasSearched && !isLoading && data && (
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {(["all", "gestor", "empresa", "pesquisador", "universidade"] as Profile[]).map(p => (
                <button
                  key={p}
                  onClick={() => handleProfile(p)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                    profile === p
                      ? p === "all" ? "bg-primary text-white" : "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={profile === p && p !== "all" ? { color: PROFILE_COLORS[p] } : undefined}
                >
                  {p === "all" && "Todos"}
                  {p === "gestor" && "Gestor"}
                  {p === "empresa" && "Empresa"}
                  {p === "pesquisador" && "Pesquisador"}
                  {p === "universidade" && "Universidade"}
                  {p !== "all" && (
                    <span className="text-[9px] px-1 py-0.5 rounded-full bg-muted text-muted-foreground">beta</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Estado inicial */}
        {!hasSearched && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <Search className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Motor da Inovação v2</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Busca única para todos os perfis. Digite o tema e veja os resultados organizados para Gestor público, Empresa, Pesquisador e Universidade — simultaneamente.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["inteligência artificial", "bioeconomia", "mobilidade elétrica", "saúde digital"].map(s => (
                  <button key={s} onClick={() => { setQuery(s); }} className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary hover:text-primary transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground text-sm">Consultando 40+ bases públicas…</p>
            </div>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md px-4">
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => setHasSearched(false)}><ArrowLeft className="w-4 h-4 mr-2" />Nova busca</Button>
            </div>
          </div>
        )}

        {/* Resultados */}
        {hasSearched && !isLoading && data && (
          <div className="flex-1 grid grid-cols-[200px_1fr] overflow-hidden">

            {/* Sidebar com chips */}
            <aside className="border-r border-border bg-card overflow-y-auto py-2">
              {sidebarConfig.groups.map((group, gi) => (
                <div key={gi}>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground px-3 pt-3 pb-1.5">{group.title}</p>
                  <div className="px-2 pb-1 flex flex-wrap gap-1.5">
                    {group.chips.map(chip => {
                      const key = `${profile}-${group.title}-${chip}`;
                      const isOn = activeChips[key] !== false;
                      return (
                        <button key={chip} onClick={() => toggleChip(key)}
                          className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${isOn ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-border text-muted-foreground hover:text-foreground"}`}>
                          {chip}
                        </button>
                      );
                    })}
                    {(group.toggles || []).map(tog => {
                      const key = `toggle-${profile}-${tog}`;
                      const isOn = toggles[key] !== false;
                      return (
                        <div key={tog} className="w-full flex items-center justify-between py-1">
                          <span className="text-[10px] text-muted-foreground">{tog}</span>
                          <button onClick={() => toggleSwitch(key)}
                            className={`w-7 h-4 rounded-full relative transition-colors ${isOn ? "bg-primary" : "bg-muted-foreground/30"}`}>
                            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isOn ? "left-3.5" : "left-0.5"}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {gi < sidebarConfig.groups.length - 1 && <div className="mx-3 border-b border-border mt-1" />}
                </div>
              ))}
            </aside>

            {/* Área central */}
            <div className="flex flex-col overflow-hidden">
              {/* Subtabs */}
              <div className="flex border-b border-border bg-card overflow-x-auto flex-shrink-0">
                {currentTabs.map((tab, i) => (
                  <button key={tab} onClick={() => setTabIndex(i)}
                    className={`px-3 py-2.5 text-[11px] font-medium whitespace-nowrap border-b-2 transition-all ${
                      i === tabIndex
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}>
                    {tab}
                  </button>
                ))}
              </div>

              {/* Conteúdo do grid fixo */}
              <div className="flex-1 overflow-hidden">
                <TabContent
                  profile={profile}
                  tab={currentTabs[tabIndex]}
                  data={data}
                  analysis={analysis}
                  isAnalyzing={isAnalyzing}
                  analysisError={analysisError}
                  requestAnalysis={requestAnalysis}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default MotorV2;
