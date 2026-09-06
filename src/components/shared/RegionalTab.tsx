import { useEffect, useState } from "react";
import { MapPin, ExternalLink, Building2, Landmark, Newspaper, HandCoins, Factory, AlertTriangle } from "lucide-react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import { useMotorLocation } from "@/hooks/useLocation";
import type { Persona } from "@/types/persona";
import type { MotorSearchResult } from "@/hooks/useMotorSearch";

interface RegionalTabProps {
  persona: Persona;
  data: MotorSearchResult;
  /** Empresas já buscadas pelo painel (evita chamada duplicada ao competitor-search) */
  competitors?: any;
  /** Bloco de emprego (CAGED) já renderizado em outra aba — referência, não duplicação */
  cagedNote?: React.ReactNode;
}

const fmtBRL = (v: number | null | undefined, compact = true) =>
  v === null || v === undefined
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: compact ? "compact" : "standard", maximumFractionDigits: compact ? 1 : 0 }).format(v);

const PERSONA_INTRO: Record<Persona, { title: string; text: string }> = {
  pesquisador: {
    title: "O que existe perto de você para esta pesquisa",
    text: "Instituições que publicam sobre o tema na sua região, quanto a prefeitura reserva para Ciência e Tecnologia e o que já saiu no Diário Oficial local (editais, chamadas, convênios).",
  },
  universidade: {
    title: "Posição da sua instituição no território",
    text: "Instituições locais que atuam no tema, recursos federais recebidos pelo município e o peso econômico da cidade — base para propor parcerias com a prefeitura e captar convênios.",
  },
  empresa: {
    title: "O mercado local para o seu negócio",
    text: "Empresas do setor que já atuam na cidade, tamanho da economia municipal (PIB) e sinais de emprego. Use para decidir onde instalar, vender ou buscar parceiros.",
  },
  governo: {
    title: "Panorama fiscal e econômico do município",
    text: "Receitas, despesas e orçamento de Ciência e Tecnologia declarados ao Tesouro, PIB municipal, convênios federais recebidos e menções ao tema no Diário Oficial.",
  },
};

function SourceLine({ source, extra }: { source?: { name: string; url: string }; extra?: string }) {
  if (!source) return null;
  return (
    <p className="text-[11px] text-muted-foreground mt-3 flex flex-wrap items-center gap-1">
      📌 Fonte: <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground inline-flex items-center gap-0.5">{source.name}<ExternalLink className="w-3 h-3" /></a>
      {extra && <span>· {extra}</span>}
    </p>
  );
}

function Unavailable({ reason, source }: { reason?: string; source?: { name: string; url: string } }) {
  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2.5">
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
      <div>
        <p>Dado indisponível: {reason || "motivo não informado pela fonte"}.</p>
        {source && (
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs underline hover:text-foreground inline-flex items-center gap-0.5">
            Consultar {source.name} diretamente <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">{icon} {title}</h4>
      {children}
    </div>
  );
}

// ---------- Blocos ----------
function PibBlock({ block }: { block: any }) {
  if (!block) return <Unavailable reason="camada regional não retornou este bloco" />;
  if (!block.available) return <Unavailable reason={block.reason} source={block.source} />;
  const d = block.data;
  const setores = d.indicators.filter((i: any) => ["513", "517", "6575", "525"].includes(i.code));
  const vaTotal = d.indicators.find((i: any) => i.code === "498")?.value || 0;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[11px] text-muted-foreground">PIB municipal ({d.pib_year})</p>
          <p className="text-xl font-bold text-foreground">{fmtBRL(d.pib_total)}</p>
          {d.pib_variation_pct !== null && (
            <p className={`text-xs ${d.pib_variation_pct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {d.pib_variation_pct >= 0 ? "+" : ""}{d.pib_variation_pct}% vs. ano anterior (nominal)
            </p>
          )}
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[11px] text-muted-foreground">Peso da indústria no valor adicionado</p>
          <p className="text-xl font-bold text-foreground">{d.industry_share_pct !== null ? `${d.industry_share_pct}%` : "—"}</p>
          <p className="text-xs text-muted-foreground">Indica vocação industrial × serviços</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {setores.map((s: any) => {
          const pct = s.value && vaTotal ? Math.round((s.value / vaTotal) * 100) : null;
          return (
            <div key={s.code} className="flex items-center gap-2 text-xs">
              <span className="w-56 truncate text-muted-foreground" title={s.label}>{s.label}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                {pct !== null && <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />}
              </div>
              <span className="w-24 text-right text-foreground">{s.value ? `${fmtBRL(s.value)} (${pct}%)` : "não divulgado"}</span>
            </div>
          );
        })}
      </div>
      <SourceLine source={block.source} extra={`valores a preços correntes, ano ${d.pib_year}`} />
    </>
  );
}

function SiconfiBlock({ block, emphasizeCT }: { block: any; emphasizeCT?: boolean }) {
  if (!block) return <Unavailable reason="camada regional não retornou este bloco" />;
  if (!block.available) return <Unavailable reason={block.reason} source={block.source} />;
  const d = block.data;
  const ct = d.ciencia_tecnologia;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[11px] text-muted-foreground">Receita arrecadada ({d.year})</p>
          <p className="text-lg font-bold text-foreground">{fmtBRL(d.receita_total)}</p>
          {d.receita_prevista && <p className="text-[11px] text-muted-foreground">previsto: {fmtBRL(d.receita_prevista)}</p>}
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[11px] text-muted-foreground">Despesa empenhada ({d.year})</p>
          <p className="text-lg font-bold text-foreground">{fmtBRL(d.despesa_empenhada)}</p>
          {d.despesa_paga && <p className="text-[11px] text-muted-foreground">pago: {fmtBRL(d.despesa_paga)}</p>}
        </div>
        <div className={`rounded-lg p-3 col-span-2 md:col-span-1 ${emphasizeCT ? "bg-primary/10 border border-primary/20" : "bg-muted/30"}`}>
          <p className="text-[11px] text-muted-foreground">Função 19 — Ciência e Tecnologia</p>
          {ct ? (
            <>
              <p className="text-lg font-bold text-foreground">{fmtBRL(ct.empenhado ?? ct.dotacao_atualizada)}</p>
              <p className="text-[11px] text-muted-foreground">
                {ct.empenhado ? `empenhado` : `orçado (nada empenhado)`}
                {d.ciencia_tecnologia_share_pct !== null && ` · ${d.ciencia_tecnologia_share_pct}% da despesa`}
                {ct.dotacao_atualizada && ct.empenhado ? ` · dotação ${fmtBRL(ct.dotacao_atualizada)}` : ""}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">{d.ct_note}</p>
          )}
        </div>
      </div>
      {d.top_funcoes?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground mb-1.5">Maiores áreas de gasto do município</p>
          <div className="flex flex-wrap gap-1.5">
            {d.top_funcoes.map((f: any) => (
              <span key={f.funcao} className="text-[11px] px-2 py-0.5 bg-muted rounded-md text-muted-foreground">{f.funcao}: {fmtBRL(f.value)}</span>
            ))}
          </div>
        </div>
      )}
      <SourceLine source={block.source} extra={`RREO ${d.year}, ${d.periodo}`} />
    </>
  );
}

function GazettesBlock({ block, query }: { block: any; query: string }) {
  if (!block) return <Unavailable reason="camada regional não retornou este bloco" />;
  if (!block.available) return <Unavailable reason={block.reason} source={block.source} />;
  const d = block.data;
  return (
    <>
      <p className="text-xs text-muted-foreground mb-3">{d.total.toLocaleString("pt-BR")} diário(s) mencionam "{query}" neste município. Os mais relevantes:</p>
      <div className="space-y-2">
        {d.items.slice(0, 6).map((g: any, i: number) => (
          <a key={i} href={g.url} target="_blank" rel="noopener noreferrer" className="block bg-muted/30 hover:bg-muted/50 rounded-lg p-3 transition-colors">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs font-medium text-foreground">Diário Oficial de {g.territory} · {g.date ? new Date(g.date).toLocaleDateString("pt-BR") : ""}</p>
              <span className="text-[10px] text-muted-foreground">{g.edition ? `ed. ${g.edition}` : ""}{g.is_extra ? " (extra)" : ""}</span>
            </div>
            {g.excerpt && <p className="text-xs text-muted-foreground line-clamp-3">…{g.excerpt.replace(/\s+/g, " ").trim()}…</p>}
          </a>
        ))}
      </div>
      <SourceLine source={block.source} />
    </>
  );
}

function ConveniosBlock({ block }: { block: any }) {
  if (!block) return <Unavailable reason="camada regional não retornou este bloco" />;
  if (!block.available) return <Unavailable reason={block.reason} source={block.source} />;
  const d = block.data;
  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-muted/30 rounded-lg p-3"><p className="text-[11px] text-muted-foreground">Convênios (12 meses)</p><p className="text-lg font-bold text-foreground">{d.total}</p></div>
        <div className="bg-muted/30 rounded-lg p-3"><p className="text-[11px] text-muted-foreground">Valor total</p><p className="text-lg font-bold text-foreground">{fmtBRL(d.total_value)}</p></div>
        <div className="bg-muted/30 rounded-lg p-3"><p className="text-[11px] text-muted-foreground">Ligados ao tema</p><p className="text-lg font-bold text-foreground">{d.related_count}</p></div>
      </div>
      <div className="space-y-2">
        {d.items.slice(0, 6).map((c: any, i: number) => (
          <div key={i} className={`rounded-lg p-3 ${c.related_to_theme ? "bg-primary/5 border border-primary/15" : "bg-muted/30"}`}>
            <p className="text-xs text-foreground line-clamp-2">{c.object}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{c.grantor} → {c.proponent} · {fmtBRL(c.value)} · {c.situation}</p>
          </div>
        ))}
      </div>
      <SourceLine source={block.source} />
    </>
  );
}

function LocalInstitutionsBlock({ data, label }: { data: MotorSearchResult; label: string }) {
  const insts: any[] = (data.layers as any).knowledge?.local_institutions || [];
  return (
    <>
      {insts.length === 0 ? (
        <Unavailable reason={`o OpenAlex não registra instituições em ${label} com publicações sobre este tema`} source={{ name: "OpenAlex", url: "https://openalex.org" }} />
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {insts.slice(0, 8).map((inst: any, i: number) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
              <p className="text-sm text-foreground truncate">{inst.name}</p>
              <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{(inst.works_count ?? inst.count ?? 0).toLocaleString("pt-BR")} publicações</span>
            </div>
          ))}
        </div>
      )}
      <SourceLine source={{ name: "OpenAlex (instituições geolocalizadas)", url: "https://openalex.org" }} />
    </>
  );
}

function LocalCompaniesBlock({ competitors, loading }: { competitors: any; loading: boolean }) {
  const { uf, municipioNome, label } = useMotorLocation();
  if (loading) return <p className="text-sm text-muted-foreground">Buscando empresas em {label}…</p>;
  const br: any[] = competitors?.competitors_br || [];
  const locais = br.filter((c) =>
    municipioNome ? (c.municipio || "").toLowerCase() === municipioNome.toLowerCase() : (c.uf || "").toUpperCase() === uf.toUpperCase()
  );
  return (
    <>
      {locais.length === 0 ? (
        <Unavailable reason={`nenhuma empresa do setor com sede em ${label} apareceu nos contratos públicos (PNCP) e registros de CNPJ consultados`} source={{ name: "PNCP", url: "https://pncp.gov.br" }} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {locais.slice(0, 8).map((c: any, i: number) => (
            <div key={i} className="bg-muted/30 rounded-lg p-3">
              <p className="text-sm font-medium text-foreground">{c.name || c.razao_social}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {[c.municipio, c.uf].filter(Boolean).join(" · ")}{c.cnae ? ` · CNAE ${c.cnae}` : ""}{c.contracts_count ? ` · ${c.contracts_count} contrato(s) público(s)` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
      <SourceLine source={{ name: "PNCP + Receita Federal/BrasilAPI", url: "https://pncp.gov.br" }} />
    </>
  );
}

// ---------- Componente principal ----------
export default function RegionalTab({ persona, data, competitors, cagedNote }: RegionalTabProps) {
  const { uf, ufNome, municipioNome, municipioIbge, label, hasLocation } = useMotorLocation();
  const regional = (data.layers as any).regional;
  const intro = PERSONA_INTRO[persona];

  // competitor-search só quando a persona precisa e o painel não forneceu
  const needsCompanies = persona === "empresa" || persona === "pesquisador";
  const [ownCompetitors, setOwnCompetitors] = useState<any>(null);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  useEffect(() => {
    if (!needsCompanies || competitors !== undefined || !hasLocation || !data?.query || ownCompetitors) return;
    setLoadingCompanies(true);
    supabase.functions.invoke("competitor-search", { body: { query: data.query } })
      .then(({ data: r }) => { if (r && !r.error) setOwnCompetitors(r); })
      .catch(console.warn)
      .finally(() => setLoadingCompanies(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.query, hasLocation]);
  const comps = competitors !== undefined ? competitors : ownCompetitors;

  if (!hasLocation) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <MapPin className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="text-base font-semibold text-foreground mb-1">Selecione um estado e município</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          A Visão Regional mostra PIB municipal, orçamento da prefeitura, Diário Oficial local e instituições da sua cidade.
          Volte à tela inicial e escolha a localização antes de pesquisar.
        </p>
      </div>
    );
  }

  const ufOnly = !municipioIbge;

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-base font-semibold text-foreground mb-1 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {intro.title} <span className="text-muted-foreground font-normal">— {label}</span></h3>
        <p className="text-sm text-muted-foreground">{intro.text}</p>
        <p className="text-xs text-muted-foreground mt-2">📌 Fontes: IBGE/SIDRA, SICONFI (Tesouro Nacional), Querido Diário, Portal da Transparência, OpenAlex e PNCP. Cada bloco indica sua origem e, quando um dado não existe, o motivo.</p>
      </div>

      {ufOnly && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-sm text-muted-foreground">
          Você selecionou apenas o estado ({ufNome || uf}). PIB, orçamento e Diário Oficial são consultados por município — escolha uma cidade para vê-los. Abaixo, o que já é possível mostrar por estado.
        </div>
      )}
      {!ufOnly && regional && regional.available === false && (
        <Unavailable reason={regional.reason || "a camada regional falhou"} />
      )}

      {/* Instituições locais — todas as personas exceto Empresa em primeiro plano */}
      {(persona === "pesquisador" || persona === "universidade") && (
        <Card icon={<Building2 className="w-4 h-4 text-primary" />} title={`Instituições de pesquisa em ${label}`}>
          <LocalInstitutionsBlock data={data} label={label} />
        </Card>
      )}

      {/* Empresas locais */}
      {persona === "empresa" && (
        <Card icon={<Factory className="w-4 h-4 text-primary" />} title={`Empresas do setor em ${label}`}>
          <LocalCompaniesBlock competitors={comps} loading={loadingCompanies} />
        </Card>
      )}

      {!ufOnly && (
        <div className="grid gap-5 lg:grid-cols-2">
          {(persona === "empresa" || persona === "governo" || persona === "universidade") && (
            <Card icon={<Landmark className="w-4 h-4 text-primary" />} title={`Economia de ${municipioNome}`}>
              <PibBlock block={regional?.pib} />
            </Card>
          )}
          {(persona === "pesquisador" || persona === "governo") && (
            <Card icon={<Landmark className="w-4 h-4 text-primary" />} title={persona === "governo" ? "Panorama fiscal (SICONFI)" : "Orçamento municipal de Ciência e Tecnologia"}>
              <SiconfiBlock block={regional?.siconfi} emphasizeCT={persona === "pesquisador"} />
            </Card>
          )}
          {(persona === "pesquisador" || persona === "governo") && (
            <Card icon={<Newspaper className="w-4 h-4 text-primary" />} title="Menções no Diário Oficial local">
              <GazettesBlock block={regional?.gazettes} query={data.query} />
            </Card>
          )}
          {(persona === "universidade" || persona === "governo") && (
            <Card icon={<HandCoins className="w-4 h-4 text-primary" />} title="Convênios federais recebidos pelo município">
              <ConveniosBlock block={regional?.convenios} />
            </Card>
          )}
          {persona === "empresa" && (
            <Card icon={<Landmark className="w-4 h-4 text-primary" />} title="Investimento público local em C&T">
              <SiconfiBlock block={regional?.siconfi} emphasizeCT />
            </Card>
          )}
        </div>
      )}

      {/* Pesquisador: empresas locais como complemento */}
      {persona === "pesquisador" && (
        <Card icon={<Factory className="w-4 h-4 text-primary" />} title={`Empresas do setor em ${label}`}>
          <LocalCompaniesBlock competitors={comps} loading={loadingCompanies} />
        </Card>
      )}

      {/* Universidade: comparação intra-estado */}
      {persona === "universidade" && (
        <Card icon={<Building2 className="w-4 h-4 text-primary" />} title={`Comparação com outros municípios de ${ufNome || uf}`}>
          {(() => {
            const insts: any[] = (data.layers as any).knowledge?.local_institutions || [];
            const byCity = insts.reduce((acc: Record<string, { n: number; works: number }>, i: any) => {
              const city = i.city || i.municipio || "não informado";
              acc[city] = acc[city] || { n: 0, works: 0 };
              acc[city].n += 1; acc[city].works += i.works_count ?? i.count ?? 0;
              return acc;
            }, {});
            const cities = Object.entries(byCity).sort((a, b) => b[1].works - a[1].works);
            if (cities.length <= 1) {
              return <Unavailable reason={`o OpenAlex retornou instituições de apenas ${cities.length} município do estado para este tema — não há base para comparação`} source={{ name: "OpenAlex", url: "https://openalex.org" }} />;
            }
            return (
              <>
                <div className="space-y-1.5">
                  {cities.slice(0, 8).map(([city, v]) => (
                    <div key={city} className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-lg ${city.toLowerCase() === municipioNome.toLowerCase() ? "bg-primary/10" : "bg-muted/30"}`}>
                      <span className="text-foreground">{city}</span>
                      <span className="text-muted-foreground">{v.n} instituição(ões) · {v.works.toLocaleString("pt-BR")} publicações</span>
                    </div>
                  ))}
                </div>
                <SourceLine source={{ name: "OpenAlex (instituições geolocalizadas)", url: "https://openalex.org" }} />
              </>
            );
          })()}
        </Card>
      )}

      {/* Empresa: referência ao CAGED já mostrado */}
      {persona === "empresa" && cagedNote && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h4 className="text-sm font-semibold text-foreground mb-2">👷 Mão de obra</h4>
          {cagedNote}
        </div>
      )}
    </div>
  );
}
