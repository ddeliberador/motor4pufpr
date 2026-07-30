import { ExternalLink, FileText, Building2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface PoliciesTabProps {
  policies: any;
  persona: "pesquisador" | "universidade" | "empresa" | "governo";
  query: string;
}

const NIVEL_COLORS = {
  federal: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  estadual_sp: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  municipal: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const NIVEL_LABELS = {
  federal: "Federal",
  estadual_sp: "Estadual · SP",
  municipal: "Municipal",
};

function PoliticaCard({ politica, persona, nivel }: { politica: any; persona: string; nivel: string }) {
  const [open, setOpen] = useState(false);
  const relevancia = politica.relevancia?.[persona] || "";

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold font-mono text-foreground">{politica.sigla}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${NIVEL_COLORS[nivel as keyof typeof NIVEL_COLORS] || "bg-muted text-muted-foreground border-border"}`}>
              {NIVEL_LABELS[nivel as keyof typeof NIVEL_LABELS] || nivel}
            </span>
            <span className="text-[9px] text-muted-foreground">{politica.vigencia}</span>
          </div>
          <p className="text-xs font-medium text-foreground">{politica.nome}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{politica.orgao}</p>
          {relevancia && (
            <p className="text-[10px] text-primary mt-1.5 font-medium">→ {relevancia}</p>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 mt-0.5">
          <a
            href={politica.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border/30 pt-3 bg-muted/10">
          <p className="text-xs text-muted-foreground leading-relaxed">{politica.descricao}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded font-mono">{politica.instrumento}</span>
            {politica.abrangencia && (
              <span className="text-[9px] text-muted-foreground">{politica.abrangencia}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PoliciesTab({ policies, persona, query }: PoliciesTabProps) {
  if (!policies) return (
    <div className="text-center py-8">
      <p className="text-sm text-muted-foreground">Carregando políticas de inovação...</p>
    </div>
  );

  const { politicas, gazettes_mencoes, editais_inovacao } = policies;
  const allPoliticas = [
    ...((politicas?.federal || []).map((p: any) => ({ ...p, _nivel: "federal" }))),
    ...((politicas?.estadual_sp || []).map((p: any) => ({ ...p, _nivel: "estadual_sp" }))),
    ...((politicas?.municipal || []).map((p: any) => ({ ...p, _nivel: "municipal" }))),
  ];

  return (
    <div className="space-y-5">
      {/* Header contextual */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-1">Marco regulatório · inovação</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Políticas públicas federais, estaduais e municipais diretamente relacionadas ao ecossistema de inovação.
          A relevância de cada política é apresentada sob a perspectiva do seu perfil.
        </p>
      </div>

      {/* Políticas curadas */}
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono px-1">
          {allPoliticas.length} instrumentos mapeados
        </p>
        {allPoliticas.map((p: any, i: number) => (
          <PoliticaCard key={i} politica={p} persona={persona} nivel={p._nivel} />
        ))}
      </div>

      {/* Menções no Querido Diário */}
      {gazettes_mencoes?.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Menções em diários oficiais — Querido Diário
            </h3>
            <a href="https://queridodiario.ok.org.br" target="_blank" rel="noopener noreferrer"
               className="text-[10px] text-primary hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> QD
            </a>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3">
            Menções a "inovação" relacionadas ao tema "{query}" em diários oficiais municipais.
          </p>
          <div className="space-y-2">
            {gazettes_mencoes.slice(0, 5).map((g: any, i: number) => (
              <a key={i} href={g.url || "#"} target="_blank" rel="noopener noreferrer"
                 className="flex items-start gap-3 p-3 border border-border/50 rounded-lg hover:border-border transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-medium text-foreground">{g.territory}</span>
                    {g.state && <span className="text-[9px] font-mono bg-muted px-1 rounded">{g.state}</span>}
                    {g.date && <span className="text-[9px] text-muted-foreground">{g.date}</span>}
                  </div>
                  {g.excerpts?.[0] && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{g.excerpts[0]}</p>
                  )}
                </div>
                <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Editais de inovação no PNCP */}
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
            {editais_inovacao.slice(0, 6).map((e: any, i: number) => (
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

      <p className="text-[9px] text-muted-foreground text-center">
        Fonte: legislação federal e estadual curada · Querido Diário · PNCP · Atualizado jul/2026
      </p>
    </div>
  );
}
