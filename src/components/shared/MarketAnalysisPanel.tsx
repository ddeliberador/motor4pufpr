import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ShieldAlert,
  Building2,
  Globe2,
  TrendingUp,
  TrendingDown,
  Target,
  ExternalLink,
  Info,
} from "lucide-react";

export interface PatentHolder {
  applicant: string;
  families: number;
  countries: string[];
  years: number[];
  has_br_filing: boolean;
  is_brazilian: boolean;
  sample_publication: string | null;
  espacenet_url: string | null;
}

export interface MarketLayerData {
  patents?: {
    holders: PatentHolder[];
    total_families: number;
    queries: string[];
    available: boolean;
    reason?: string;
  };
  market?: {
    suppliers: Array<{
      name: string;
      cnpj: string;
      contracts: number;
      value: number;
      share: number;
      uf?: string;
      porte?: string;
      cnae?: string;
      municipio?: string;
      razao_social?: string;
    }>;
    total_suppliers: number;
    total_value: number;
    total_contracts: number;
    hhi: number;
    cr4: number;
    concentration_label: string;
    available: boolean;
  };
  trade?: {
    items: Array<{
      code: string;
      description: string;
      export_fob: number;
      import_fob: number;
      balance: number;
      year: number;
      url: string;
    }>;
    total_export: number;
    total_import: number;
    balance: number;
    year?: number;
    available: boolean;
    reason?: string;
  };
  opportunities?: Array<{
    title: string;
    evidence: string;
    metric: string;
    source: string;
    url?: string;
    severity: "alta" | "media" | "baixa";
  }>;
  sources?: string[];
}

interface Props {
  data: MarketLayerData | null | undefined;
  /** Estrutura setorial vinda da camada SIDRA (CEMPRE/IBGE) */
  cempre?: any;
  perfil: "empresa" | "governo";
}

const brl = (v: number) =>
  v >= 1e9 ? `R$ ${(v / 1e9).toFixed(2)} bi` : v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)} mi` : `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

const usd = (v: number) =>
  v >= 1e9 ? `US$ ${(v / 1e9).toFixed(2)} bi` : `US$ ${(v / 1e6).toFixed(1)} mi`;

function EmptyBlock({ title, reason, source }: { title: string; reason: string; source: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-5 text-sm">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-muted-foreground">{reason}</p>
      <p className="mt-2 text-xs text-muted-foreground">Fonte consultada: {source}</p>
    </div>
  );
}

const MarketAnalysisPanel = ({ data, cempre, perfil }: Props) => {
  const patents = data?.patents;
  const market = data?.market;
  const trade = data?.trade;
  const opportunities = data?.opportunities || [];

  const isGov = perfil === "governo";
  const brHolders = (patents?.holders || []).filter((h) => h.is_brazilian || h.has_br_filing).length;

  return (
    <div className="space-y-6">
      {/* Leitura por perfil */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground flex gap-3">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          {isGov
            ? "Leitura para política pública: grau de concentração do mercado, dependência tecnológica externa e lacunas de fornecimento nacional passíveis de indução."
            : "Leitura para a empresa: quem detém a propriedade industrial do campo, quem já fornece ao Estado e onde há espaço comercial não ocupado."}
        </p>
      </div>

      {/* 1. Detentores de patente */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Detentores de patente</h3>
          </div>
          {patents?.available && patents.holders.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline">{patents.total_families.toLocaleString("pt-BR")} famílias encontradas</Badge>
              <Badge variant={brHolders > 0 ? "secondary" : "destructive"}>
                {brHolders} titular(es) com vínculo BR
              </Badge>
            </div>
          )}
        </div>

        {!patents?.available || patents.holders.length === 0 ? (
          <EmptyBlock
            title="Sem titulares identificados"
            reason={patents?.reason || "A consulta não retornou dados."}
            source="EPO Open Patent Services (Espacenet)"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-medium">Titular</th>
                  <th className="py-2 pr-3 font-medium">Famílias</th>
                  <th className="py-2 pr-3 font-medium">Jurisdições</th>
                  <th className="py-2 pr-3 font-medium">Anos</th>
                  <th className="py-2 font-medium">Espacenet</th>
                </tr>
              </thead>
              <tbody>
                {patents.holders.map((h) => (
                  <tr key={h.applicant} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3">
                      <span className="text-foreground">{h.applicant}</span>
                      {(h.is_brazilian || h.has_br_filing) && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">BR</Badge>
                      )}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-foreground">{h.families}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{h.countries.slice(0, 6).join(" · ") || "—"}</td>
                    <td className="py-2 pr-3 text-muted-foreground tabular-nums">{h.years.join(", ") || "—"}</td>
                    <td className="py-2">
                      {h.espacenet_url ? (
                        <a
                          href={h.espacenet_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {h.sample_publication} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {patents.queries.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Consultas EPO OPS: {patents.queries.map((q) => `"${q}"`).join(" · ")}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* 2. Participação no mercado nacional */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Participação no mercado público</h3>
          </div>

          {!market?.available || market.suppliers.length === 0 ? (
            <EmptyBlock
              title="Sem fornecedores identificados"
              reason="Nenhuma contratação pública encontrada para os termos deste tema."
              source="PNCP — Portal Nacional de Contratações Públicas"
            />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Valor contratado</p>
                  <p className="text-lg font-semibold text-foreground tabular-nums">{brl(market.total_value)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Fornecedores</p>
                  <p className="text-lg font-semibold text-foreground tabular-nums">{market.total_suppliers}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">HHI</p>
                  <p className="text-lg font-semibold text-foreground tabular-nums">{market.hhi}</p>
                  <p className="text-[11px] text-muted-foreground">{market.concentration_label}</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-3">
                CR4 (4 maiores) — {market.cr4}% do valor.
                {isGov
                  ? " HHI acima de 2.500 indica mercado concentrado e sujeito a poder de mercado do fornecedor."
                  : " Quanto maior o HHI, menos disputado é o mercado — e maior a barreira de entrada."}
              </p>

              <div className="space-y-3">
                {market.suppliers.slice(0, 10).map((s) => (
                  <div key={s.cnpj}>
                    <div className="flex justify-between items-baseline gap-3 text-sm">
                      <span className="text-foreground truncate">{s.razao_social || s.name}</span>
                      <span className="tabular-nums text-muted-foreground shrink-0">
                        {s.share.toFixed(1)}% · {brl(s.value)}
                      </span>
                    </div>
                    <Progress value={Math.min(100, s.share)} className="h-1.5 mt-1" />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {[s.cnpj, s.uf, s.porte, s.cnae].filter(Boolean).join(" · ")} — {s.contracts} contrato(s)
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <div className="space-y-6">
          {/* Estrutura setorial CEMPRE */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Estrutura do setor (CEMPRE/IBGE)</h3>
            </div>
            {!cempre || !Array.isArray(cempre.setores) || cempre.setores.length === 0 ? (
              <EmptyBlock
                title="Sem estrutura setorial"
                reason="A divisão CNAE do tema não retornou dados no cadastro de empresas."
                source="IBGE — CEMPRE (tabela 992)"
              />
            ) : (
              <div className="space-y-3">
                {cempre.setores.slice(0, 6).map((a: any, i: number) => (
                  <div key={i} className="flex justify-between items-baseline gap-3 text-sm border-b border-border/50 pb-2 last:border-0">
                    <span className="text-foreground">{a.atividade}</span>
                    <span className="tabular-nums text-muted-foreground shrink-0 text-right">
                      {a.empresas ? `${a.empresas} empresas` : ""}
                      {a.pessoal ? ` · ${a.pessoal} ocupados` : ""}
                    </span>
                  </div>
                ))}
                {cempre.periodo && (
                  <p className="text-xs text-muted-foreground">
                    {cempre.fonte || "CEMPRE — IBGE"} · Período: {cempre.periodo}
                  </p>
                )}
              </div>
            )}

          </Card>

          {/* Balança comercial */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe2 className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Comércio exterior (NCM)</h3>
            </div>
            {!trade?.available || trade.items.length === 0 ? (
              <EmptyBlock
                title="Sem dados de comércio exterior"
                reason={trade?.reason || "Nenhum NCM retornou movimentação."}
                source="COMEX Stat/MDIC"
              />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Exportação</p>
                    <p className="text-base font-semibold text-foreground tabular-nums">{usd(trade.total_export)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Importação</p>
                    <p className="text-base font-semibold text-foreground tabular-nums">{usd(trade.total_import)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Saldo {trade.year ? `(${trade.year})` : ""}</p>
                    <p className="text-base font-semibold tabular-nums flex items-center gap-1">
                      {trade.balance >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                      )}
                      {usd(Math.abs(trade.balance))}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {trade.items.map((it) => (
                    <div key={it.code} className="text-sm border-b border-border/50 pb-2 last:border-0">
                      <p className="text-foreground">NCM {it.code} — {it.description}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        Exp. {usd(it.export_fob)} · Imp. {usd(it.import_fob)} · Saldo {usd(it.balance)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* 3. Oportunidades */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">
            {isGov ? "Lacunas e frentes de indução" : "Oportunidades comerciais"}
          </h3>
        </div>
        {opportunities.length === 0 ? (
          <EmptyBlock
            title="Sem oportunidades derivadas"
            reason="Nenhuma das fontes retornou dados suficientes para derivar oportunidades."
            source="EPO OPS · PNCP · COMEX Stat · OpenAlex"
          />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {opportunities.map((o, i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-medium text-foreground text-sm">{o.title}</p>
                  <Badge
                    variant={o.severity === "alta" ? "destructive" : o.severity === "media" ? "secondary" : "outline"}
                    className="text-[10px] shrink-0"
                  >
                    {o.severity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{o.evidence}</p>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-foreground tabular-nums">{o.metric}</span>
                  {o.url ? (
                    <a
                      href={o.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {o.source} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">{o.source}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {data?.sources && data.sources.length > 0 && (
        <p className="text-xs text-muted-foreground">Fontes desta aba: {data.sources.join(" · ")}</p>
      )}
    </div>
  );
};

export default MarketAnalysisPanel;
