import { Landmark, TrendingUp, PieChart as PieIcon, Factory, Users, Zap, ExternalLink, AlertTriangle } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import type { MotorSearchResult } from "@/hooks/useMotorSearch";

interface Props {
  data: MotorSearchResult;
}

const fmtBRL = (v: number | null | undefined, compact = true) =>
  v === null || v === undefined
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: compact ? "compact" : "standard", maximumFractionDigits: compact ? 1 : 0 }).format(v);

const fmtNum = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : new Intl.NumberFormat("pt-BR").format(v);

const SECTOR_COLORS: Record<string, string> = {
  agropecuaria: "hsl(90 55% 42%)",
  industria: "hsl(215 70% 50%)",
  servicos: "hsl(35 85% 55%)",
  administracao: "hsl(275 45% 55%)",
};

function energyColor(fonte: string) {
  const f = fonte.toLowerCase();
  if (/hidr|hídr|cgh|uhe|pch/.test(f)) return "hsl(205 80% 48%)";
  if (/eólic|eolic|eol/.test(f)) return "hsl(160 60% 45%)";
  if (/solar|fotovolt/.test(f)) return "hsl(45 90% 55%)";
  if (/biomassa|biogás|biogas|resídu/.test(f)) return "hsl(100 45% 40%)";
  if (/nuclear/.test(f)) return "hsl(280 50% 55%)";
  if (/térmi|termi|fóssil|fossil|gás|gas|carvão|carvao|óleo|oleo|diesel/.test(f)) return "hsl(220 8% 50%)";
  return "hsl(var(--muted-foreground))";
}

const chartTooltip = {
  contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 },
};

function SourceLine({ source, extra }: { source?: { name: string; url: string }; extra?: string }) {
  if (!source) return null;
  return (
    <p className="text-[11px] text-muted-foreground mt-3 flex flex-wrap items-center gap-1">
      📌 Fonte:{" "}
      <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground inline-flex items-center gap-0.5">
        {source.name}<ExternalLink className="w-3 h-3" />
      </a>
      {extra && <span>· {extra}</span>}
    </p>
  );
}

function Note({ reason, source }: { reason?: string; source?: { name: string; url: string } }) {
  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 rounded-xl px-3 py-3">
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
      <div>
        <p>{reason || "Dado não divulgado pela fonte oficial."}</p>
        {source && (
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs underline hover:text-foreground inline-flex items-center gap-0.5 mt-1">
            Consultar {source.name} diretamente <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function Panel({ icon, title, subtitle, children, className = "" }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-2xl p-5 ${className}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">{icon}</div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function PanoramaEstadualTab({ data }: Props) {
  const estado: any = (data.layers as any).estado;

  if (!estado) {
    return <Note reason="A camada estadual não retornou dados nesta busca." />;
  }
  if (estado.available === false) {
    return <Note reason={estado.reason || "Panorama estadual indisponível."} source={{ name: "IBGE/SIDRA", url: "https://sidra.ibge.gov.br/tabela/5938" }} />;
  }

  const ufNome = estado.location?.uf_nome || estado.location?.uf || "";
  const uf = estado.location?.uf || "";
  const r = estado.resumo || {};

  const pibRows = (estado.pib?.data?.pib_total || []).map((p: any) => ({
    year: p.year,
    uf: p.uf ? p.uf / 1e9 : null,
    br: p.br ? p.br / 1e9 : null,
  }));
  const perCapitaRows = estado.pib?.data?.pib_per_capita || [];
  const setores = (estado.setores?.data?.shares || []).filter((s: any) => s.share_pct !== null);
  const indSeries = (estado.industria_nacional?.data?.series || []).filter((s: any) => s.share_pct !== null);
  const indLast = estado.industria_nacional?.data?.last;
  const demo = estado.demografia;
  const energia = estado.energia;
  const energyItems: any[] = energia?.available ? (energia.data?.items || []).slice(0, 8) : [];

  return (
    <div className="space-y-5">
      {/* Header vitrine */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-primary tracking-tight">{uf}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-primary font-medium">Panorama Estadual de Inovação</p>
            <h3 className="text-2xl font-bold text-foreground leading-tight">{ufNome}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {r.pib_share_national_pct !== null && r.pib_share_national_pct !== undefined
                ? `${String(r.pib_share_national_pct).replace(".", ",")}% do PIB nacional`
                : "participação no PIB nacional não divulgada"}
              {r.industry_share_national_pct !== null && r.industry_share_national_pct !== undefined
                ? ` · ${String(r.industry_share_national_pct).replace(".", ",")}% da indústria brasileira (${r.industry_share_year})`
                : ""}
              {r.population ? ` · ${fmtNum(r.population)} habitantes` : ""}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <div className="bg-background/60 border border-border rounded-xl p-3">
            <p className="text-[11px] text-muted-foreground">PIB estadual ({r.pib_year || "—"})</p>
            <p className="text-lg font-bold text-foreground">{fmtBRL(r.pib_total)}</p>
          </div>
          <div className="bg-background/60 border border-border rounded-xl p-3">
            <p className="text-[11px] text-muted-foreground">Fatia do PIB do país</p>
            <p className="text-lg font-bold text-foreground">{r.pib_share_national_pct !== null && r.pib_share_national_pct !== undefined ? `${r.pib_share_national_pct}%` : "—"}</p>
          </div>
          <div className="bg-background/60 border border-border rounded-xl p-3">
            <p className="text-[11px] text-muted-foreground">Fatia da indústria nacional</p>
            <p className="text-lg font-bold text-foreground">{indLast?.share_pct != null ? `${indLast.share_pct}%` : "—"}</p>
          </div>
          <div className="bg-background/60 border border-border rounded-xl p-3">
            <p className="text-[11px] text-muted-foreground">População</p>
            <p className="text-lg font-bold text-foreground">{fmtNum(r.population)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* PIB total */}
        <Panel icon={<TrendingUp className="w-5 h-5 text-primary" />} title={`PIB de ${ufNome} × Brasil`} subtitle="Últimos 10 anos disponíveis, em R$ bilhões correntes">
          {pibRows.length === 0 ? (
            <Note reason={estado.pib?.reason} source={estado.pib?.source} />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pibRows} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip {...chartTooltip} formatter={(v: any) => [`R$ ${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi`, ""]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="br" name="Brasil" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="uf" name={ufNome} stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <SourceLine source={estado.pib?.source} extra="preços correntes" />
        </Panel>

        {/* PIB per capita */}
        <Panel icon={<TrendingUp className="w-5 h-5 text-primary" />} title="PIB por habitante × Brasil" subtitle="Quanto a economia produz por pessoa, em reais">
          {perCapitaRows.filter((p: any) => p.uf).length === 0 ? (
            <Note reason="Sem população estimada ou PIB suficiente para calcular o valor por habitante." source={estado.pib?.source} />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perCapitaRows} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip {...chartTooltip} formatter={(v: any) => [fmtBRL(Number(v), false), ""]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="br" name="Brasil" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="uf" name={ufNome} stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-3">{estado.per_capita_note}</p>
        </Panel>

        {/* Setores — donut */}
        <Panel icon={<PieIcon className="w-5 h-5 text-primary" />} title="Do que é feita a economia do estado" subtitle={estado.setores?.data?.year ? `Participação de cada setor no valor adicionado (${estado.setores.data.year})` : undefined}>
          {setores.length === 0 ? (
            <Note reason={estado.setores?.reason} source={estado.setores?.source} />
          ) : (
            <>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={setores} dataKey="share_pct" nameKey="label" innerRadius="52%" outerRadius="82%" paddingAngle={2} isAnimationActive={false}>
                      {setores.map((s: any) => <Cell key={s.key} fill={SECTOR_COLORS[s.key] || "hsl(var(--primary))"} />)}
                    </Pie>
                    <Tooltip {...chartTooltip} formatter={(v: any, n: any) => [`${v}%`, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 mt-2">
                {setores.map((s: any) => (
                  <div key={s.key} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: SECTOR_COLORS[s.key] }} />
                    <span className="text-muted-foreground truncate" title={s.label}>{s.label}</span>
                    <span className="ml-auto font-medium text-foreground">{s.share_pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <SourceLine source={estado.setores?.source} />
        </Panel>

        {/* Indústria estadual no total nacional */}
        <Panel icon={<Factory className="w-5 h-5 text-primary" />} title="Peso da indústria estadual na indústria do país" subtitle="Quanto da produção industrial brasileira sai deste estado">
          {indSeries.length === 0 ? (
            <Note reason={estado.industria_nacional?.reason} source={estado.industria_nacional?.source} />
          ) : (
            <>
              {indLast && (
                <div className="inline-flex items-baseline gap-2 mb-3 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
                  <span className="text-2xl font-bold text-primary">{indLast.share_pct}%</span>
                  <span className="text-xs text-muted-foreground">em {indLast.year} — dado mais recente</span>
                </div>
              )}
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={indSeries} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="indGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip {...chartTooltip} formatter={(v: any) => [`${v}%`, "Participação"]} />
                    <Area type="monotone" dataKey="share_pct" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#indGrad)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">{estado.industria_nacional?.note}</p>
            </>
          )}
          <SourceLine source={estado.industria_nacional?.source} />
        </Panel>

        {/* Demografia */}
        <Panel icon={<Users className="w-5 h-5 text-primary" />} title="População do estado" subtitle="Estimativa oficial e evolução recente">
          {!demo?.available ? (
            <Note reason={demo?.reason} source={demo?.source} />
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <p className="text-4xl font-bold text-foreground leading-none">{fmtNum(demo.data.population)}</p>
                  <p className="text-xs text-muted-foreground mt-1">habitantes em {demo.data.year}</p>
                </div>
                <div className="space-y-1">
                  {demo.data.share_pct !== null && (
                    <p className="text-xs text-muted-foreground">{demo.data.share_pct}% da população brasileira</p>
                  )}
                  {demo.data.variation_pct !== null && (
                    <p className={`text-xs font-medium ${demo.data.variation_pct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {demo.data.variation_pct >= 0 ? "+" : ""}{demo.data.variation_pct}% no período mostrado
                    </p>
                  )}
                </div>
              </div>
              <div className="h-36 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={demo.data.history} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="popGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis hide domain={["dataMin", "dataMax"]} />
                    <Tooltip {...chartTooltip} formatter={(v: any) => [fmtNum(Number(v)), "Habitantes"]} />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#popGrad)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
          <SourceLine source={demo?.source} />
        </Panel>

        {/* Matriz energética */}
        <Panel icon={<Zap className="w-5 h-5 text-primary" />} title="Matriz de geração de energia do estado" subtitle="Capacidade instalada por fonte">
          {!energia?.available ? (
            <Note reason={energia?.reason || "Matriz energética por estado não confirmada em base oficial."} source={energia?.source} />
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-2">
                Capacidade instalada total: <span className="font-semibold text-foreground">{fmtNum(energia.data.total_mw)} MW</span>
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={energyItems} dataKey="share_pct" nameKey="fonte" innerRadius="52%" outerRadius="82%" paddingAngle={2} isAnimationActive={false}>
                      {energyItems.map((e: any) => <Cell key={e.fonte} fill={energyColor(e.fonte)} />)}
                    </Pie>
                    <Tooltip {...chartTooltip} formatter={(v: any, n: any) => [`${v}%`, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 mt-2">
                {energyItems.map((e: any) => (
                  <div key={e.fonte} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: energyColor(e.fonte) }} />
                    <span className="text-muted-foreground truncate" title={e.fonte}>{e.fonte}</span>
                    <span className="ml-auto font-medium text-foreground">{e.share_pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <SourceLine source={energia?.source} />
        </Panel>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 flex items-start gap-2">
        <Landmark className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Todos os números desta página vêm de bases públicas oficiais, com o ano exato de divulgação indicado em cada bloco.
          Quando o IBGE ainda não publicou um dado (é comum o valor por setor ficar 2 anos atrasado), mostramos o motivo em vez de estimar.
        </p>
      </div>
    </div>
  );
}
