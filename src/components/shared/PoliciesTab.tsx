import { ExternalLink, FileText, Building2, ChevronDown, ChevronUp, Rocket, TrendingUp, Link as LinkIcon } from "lucide-react";
import { useState } from "react";

interface PoliciesTabProps {
  policies: any;
  persona: "pesquisador" | "universidade" | "empresa" | "governo";
  query: string;
}

const NIVEL_COLORS: Record<string, string> = {
  federal: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  estadual_sp: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  municipal: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};
const NIVEL_LABELS: Record<string, string> = {
  federal: "Federal",
  estadual_sp: "Estadual · SP",
  municipal: "Municipal",
};
const TIPO_COLORS: Record<string, string> = {
  "Incentivo fiscal federal": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Incentivo fiscal federal + política industrial": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Programa federal de aceleração": "bg-violet-500/10 text-violet-400 border-violet-500/20",
  "Programa estadual SP — financiamento": "bg-rose-500/10 text-rose-400 border-rose-500/20",
  "Programa de aceleração regional": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Rede nacional": "bg-teal-500/10 text-teal-400 border-teal-500/20",
};

function PoliticaCard({ politica, persona, nivel }: { politica: any; persona: string; nivel: string }) {
  const [open, setOpen] = useState(false);
  const relevancia = politica.relevancia?.[persona] || "";
  const isIncentivo = politica.sigla === "LEI-BEM" || politica.sigla === "LEI-INFO";

  return (
    <div className={`border rounded-xl overflow-hidden ${isIncentivo ? "border-amber-500/30 bg-amber-500/5" : "border-border/50"}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-bold font-mono ${isIncentivo ? "text-amber-400" : "text-foreground"}`}>{politica.sigla}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${NIVEL_COLORS[nivel] || "bg-muted text-muted-foreground border-border"}`}>
              {NIVEL_LABELS[nivel] || nivel}
            </span>
            {isIncentivo && <span className="text-[9px] px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20">incentivo fiscal</span>}
            <span className="text-[9px] text-muted-foreground">{politica.vigencia}</span>
          </div>
          <p className="text-xs font-medium text-foreground">{politica.nome}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{politica.orgao}</p>
          {relevancia && <p className="text-[10px] text-primary mt-1.5 font-medium">→ {relevancia}</p>}
          {/* Métricas Lei do Bem */}
          {politica.metricas && (
            <div className="flex gap-3 mt-2 flex-wrap">
              <span className="text-[10px] font-bold text-amber-400">{politica.metricas.empresas_2024?.toLocaleString("pt-BR")} empresas</span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] font-bold text-emerald-400">R$ {politica.metricas.investimento_bi}bi em P&D</span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">renúncia R$ {politica.metricas.renuncia_bi}bi</span>
              <span className="text-[10px] text-muted-foreground">· ano-base 2024</span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 mt-0.5">
          <a href={politica.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
             className="text-[10px] text-primary hover:underline">
            <ExternalLink className="w-3 h-3" />
          </a>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border/30 pt-3 bg-muted/10 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{politica.descricao}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded font-mono">{politica.instrumento}</span>
            {politica.abrangencia && <span className="text-[9px] text-muted-foreground">{politica.abrangencia}</span>}
          </div>
          {/* Links diretos quando existirem */}
          {politica.links_diretos?.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Links diretos</p>
              {politica.links_diretos.map((l: any, i: number) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 text-[10px] text-primary hover:underline">
                  <LinkIcon className="w-3 h-3 flex-shrink-0" />
                  {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EcossistemaCard({ item, persona }: { item: any; persona: string }) {
  const [open, setOpen] = useState(false);
  const relevancia = item.relevancia?.[persona] || "";
  const cor = TIPO_COLORS[item.tipo] || "bg-violet-500/10 text-violet-400 border-violet-500/20";

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold font-mono text-foreground">{item.sigla}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${cor}`}>{item.tipo}</span>
            {item.abrangencia && <span className="text-[9px] text-muted-foreground">{item.abrangencia}</span>}
          </div>
          <p className="text-xs font-medium text-foreground">{item.nome}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{item.orgao}</p>
          {relevancia && <p className="text-[10px] text-primary mt-1.5 font-medium">→ {relevancia}</p>}
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 mt-0.5">
          <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
             className="text-primary hover:underline">
            <ExternalLink className="w-3 h-3" />
          </a>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border/30 pt-3 bg-muted/10 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{item.descricao}</p>
          <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded font-mono">{item.instrumento}</span>
          {item.links_diretos?.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {item.links_diretos.map((l: any, i: number) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 text-[10px] text-primary hover:underline">
                  <LinkIcon className="w-3 h-3 flex-shrink-0" />
                  {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PoliciesTab({ policies, persona, query }: PoliciesTabProps) {
  const [section, setSection] = useState<"politicas" | "ecossistema" | "incentivos">("politicas");

  if (!policies) return (
    <div className="text-center py-8">
      <p className="text-sm text-muted-foreground">Carregando políticas de inovação...</p>
    </div>
  );

  const { politicas, ecossistema, gazettes_mencoes, editais_inovacao } = policies;

  // Separa incentivos fiscais das outras políticas
  const incentivos = (politicas?.federal || []).filter((p: any) => p.sigla === "LEI-BEM" || p.sigla === "LEI-INFO");
  const outrasPoliticas = [
    ...((politicas?.federal || []).filter((p: any) => p.sigla !== "LEI-BEM" && p.sigla !== "LEI-INFO").map((p: any) => ({ ...p, _nivel: "federal" }))),
    ...((politicas?.estadual_sp || []).map((p: any) => ({ ...p, _nivel: "estadual_sp" }))),
    ...((politicas?.municipal || []).map((p: any) => ({ ...p, _nivel: "municipal" }))),
  ];

  return (
    <div className="space-y-4">
      {/* Navegação entre seções */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl">
        {[
          { key: "politicas", label: "📋 Políticas", count: outrasPoliticas.length },
          { key: "incentivos", label: "💰 Incentivos Fiscais", count: incentivos.length },
          { key: "ecossistema", label: "🚀 Ecossistema", count: (ecossistema?.programas_aceleracao?.length || 0) + (ecossistema?.redes_habitats?.length || 0) },
        ].map((s) => (
          <button key={s.key} onClick={() => setSection(s.key as any)}
            className={`flex-1 text-xs py-2 px-3 rounded-lg transition-colors font-medium ${section === s.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {s.label}
            <span className="ml-1 text-[10px] opacity-60">({s.count})</span>
          </button>
        ))}
      </div>

      {/* SEÇÃO: POLÍTICAS */}
      {section === "politicas" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-1">Marco regulatório · inovação</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Políticas públicas federais, estaduais e municipais para o ecossistema de inovação.
              A linha "→" mostra a relevância específica para o seu perfil.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono px-1">{outrasPoliticas.length} instrumentos mapeados</p>
            {outrasPoliticas.map((p: any, i: number) => <PoliticaCard key={i} politica={p} persona={persona} nivel={p._nivel} />)}
          </div>

          {/* Querido Diário */}
          {gazettes_mencoes?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Diários oficiais — Querido Diário
                </h3>
                <a href="https://queridodiario.ok.org.br" target="_blank" rel="noopener noreferrer"
                   className="text-[10px] text-primary hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> QD
                </a>
              </div>
              <div className="space-y-2">
                {gazettes_mencoes.slice(0, 4).map((g: any, i: number) => (
                  <a key={i} href={g.url || "#"} target="_blank" rel="noopener noreferrer"
                     className="flex items-start gap-3 p-3 border border-border/50 rounded-lg hover:border-border transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium text-foreground">{g.territory}</span>
                        {g.state && <span className="text-[9px] font-mono bg-muted px-1 rounded">{g.state}</span>}
                        {g.date && <span className="text-[9px] text-muted-foreground">{g.date}</span>}
                      </div>
                      {g.excerpts?.[0] && <p className="text-[10px] text-muted-foreground line-clamp-2">{g.excerpts[0]}</p>}
                    </div>
                    <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Editais PNCP */}
          {editais_inovacao?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Editais de inovação — PNCP
                </h3>
                <a href="https://pncp.gov.br" target="_blank" rel="noopener noreferrer"
                   className="text-[10px] text-primary hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> PNCP
                </a>
              </div>
              <div className="space-y-2">
                {editais_inovacao.slice(0, 5).map((e: any, i: number) => (
                  <a key={i} href={e.url || "#"} target="_blank" rel="noopener noreferrer"
                     className="flex items-start gap-3 p-3 border border-border/50 rounded-lg hover:border-border transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground line-clamp-2">{e.objeto || "Sem descrição"}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {e.orgao && <span className="text-[10px] text-muted-foreground truncate">{e.orgao}</span>}
                        {e.uf && <span className="text-[9px] font-mono bg-muted px-1 rounded">{e.uf}</span>}
                        {e.valor > 0 && <span className="text-[10px] font-semibold text-primary">R$ {(e.valor / 1e3).toFixed(0)}k</span>}
                      </div>
                    </div>
                    <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO: INCENTIVOS FISCAIS */}
      {section === "incentivos" && (
        <div className="space-y-4">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <p className="text-[10px] font-mono text-amber-400 uppercase tracking-wider mb-1">Incentivos fiscais · P&D · TIC</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Instrumentos de desoneração fiscal para empresas que investem em pesquisa e desenvolvimento.
              Clique em cada card para ver os links diretos ao MCTI e critérios de habilitação.
            </p>
          </div>

          {/* Cards Lei do Bem e Lei da Informática */}
          <div className="space-y-2">
            {incentivos.map((p: any, i: number) => <PoliticaCard key={i} politica={p} persona={persona} nivel="federal" />)}
          </div>

          {/* Tabela comparativa rápida */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Comparativo rápido</h3>
            <div className="space-y-0 text-xs">
              {[
                { campo: "Lei", bem: "Lei 11.196/2005", info: "Lei 8.248/1991" },
                { campo: "Setor", bem: "Todos os setores (Lucro Real)", info: "TIC · Informática · Telecom" },
                { campo: "Benefício principal", bem: "Dedução 60–80% P&D no IRPJ/CSLL", info: "Redução IPI + crédito financeiro P&D" },
                { campo: "Obrigação P&D", bem: "Relatório FORMP&D ao MCTI (anual)", info: "5% faturamento TIC em P&D (mínimo)" },
                { campo: "P&D em ICTs", bem: "Facultativo (via Marco Legal CT&I)", info: "Obrigatório — parcela mínima em convênios" },
                { campo: "Habilitação", bem: "Automática (auto-declaratória)", info: "Via portaria interministerial MCTIC/MDIC" },
                { campo: "Prazo vigência", bem: "Indefinida (regime permanente)", info: "Até 31/12/2029" },
                { campo: "Volume (2024)", bem: "4.252 empresas · R$ 51,6bi P&D", info: "Empresas habilitadas SEPIN" },
              ].map((row, i) => (
                <div key={i} className={`grid grid-cols-3 gap-2 py-2 ${i < 7 ? "border-b border-border/30" : ""}`}>
                  <span className="text-[10px] text-muted-foreground font-medium">{row.campo}</span>
                  <span className="text-[10px] text-foreground">{row.bem}</span>
                  <span className="text-[10px] text-foreground">{row.info}</span>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <span className="text-[10px] text-muted-foreground" />
                <span className="text-[10px] font-bold text-amber-400">Lei do Bem</span>
                <span className="text-[10px] font-bold text-orange-400">Lei da Informática</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO: ECOSSISTEMA */}
      {section === "ecossistema" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-1">Ecossistema · Aceleradoras · Incubadoras · Startups</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Programas de aceleração, redes de habitats de inovação e links para os principais repositórios do ecossistema brasileiro.
              Dados: ANPROTEC, FAPESP, MCTI, SEBRAE.
            </p>
          </div>

          {/* Programas de aceleração */}
          {ecossistema?.programas_aceleracao?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono px-1 flex items-center gap-2">
                <Rocket className="w-3 h-3" /> Programas de aceleração
              </p>
              {ecossistema.programas_aceleracao.map((p: any, i: number) => <EcossistemaCard key={i} item={p} persona={persona} />)}
            </div>
          )}

          {/* Redes e habitats */}
          {ecossistema?.redes_habitats?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono px-1 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" /> Redes e habitats de inovação
              </p>
              {ecossistema.redes_habitats.map((r: any, i: number) => <EcossistemaCard key={i} item={r} persona={persona} />)}
            </div>
          )}

          {/* Links de busca */}
          {ecossistema?.links_busca?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Onde buscar startups e investidores</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {ecossistema.links_busca.map((l: any, i: number) => (
                  <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-2 px-3 py-2.5 border border-border/50 rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-colors">
                    <ExternalLink className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="text-xs text-foreground">{l.label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Dados numéricos ANPROTEC */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Ecossistema brasileiro em números — ANPROTEC</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { valor: "363", label: "incubadoras mapeadas" },
                { valor: "57", label: "aceleradoras ativas" },
                { valor: "3.694", label: "empresas incubadas" },
                { valor: "6.143", label: "empresas graduadas" },
              ].map((m, i) => (
                <div key={i} className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold font-mono text-foreground">{m.valor}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground mt-3 text-center">
              Fonte: ANPROTEC · Mapeamento dos Mecanismos de Geração de Empreendimentos Inovadores
            </p>
          </div>
        </div>
      )}

      <p className="text-[9px] text-muted-foreground text-center">
        Lei do Bem/MCTI · Lei da Informática/SEPIN · ANPROTEC · Querido Diário · PNCP · Atualizado jul/2026
      </p>
    </div>
  );
}
