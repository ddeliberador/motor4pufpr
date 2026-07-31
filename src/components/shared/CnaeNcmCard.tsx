import { ExternalLink, Tag, Factory } from "lucide-react";

interface CnaeNcmCardProps {
  technology: any;
}

export default function CnaeNcmCard({ technology }: CnaeNcmCardProps) {
  const cnae = technology?.cnae_result;
  const ncm = technology?.ncm_codes;

  const hasCnae = cnae && !cnae.fallback && cnae.subclasses?.length > 0;
  const hasNcm = ncm && ncm.length > 0;

  if (!hasCnae && !hasNcm) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Classificação do produto — CNAE/IBGE e NCM/MDIC</h3>
      </div>

      {/* CNAE — subclasses */}
      {hasCnae && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
            CNAE — atividades econômicas identificadas
          </p>
          <div className="space-y-1.5">
            {cnae.subclasses.slice(0, 6).map((s: any, i: number) => (
              <a
                key={i}
                href={`https://concla.ibge.gov.br/busca-online-cnae.html?view=subgrupo&tipo=cnae&versao=9.1.0&subclasse=${s.id.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 px-3 py-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <span className="text-[10px] font-mono font-bold text-primary flex-shrink-0 mt-0.5 w-16">{s.id}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-snug">{s.descricao}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    Seção {s.secao_id} — {s.secao_desc} · Div. {s.divisao_id}
                  </p>
                </div>
                <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
              </a>
            ))}
          </div>
          {cnae.divisoes?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[9px] text-muted-foreground">Divisões:</span>
              {cnae.divisoes.map((d: any, i: number) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded font-mono">
                  {d.id} · {d.descricao}
                </span>
              ))}
            </div>
          )}
          <p className="text-[9px] text-muted-foreground">
            Fonte: API CNAE/IBGE · CONCLA 2.3 · {cnae.subclasses.length} subclasses identificadas
          </p>
        </div>
      )}

      {/* NCM */}
      {hasNcm && (
        <div className="space-y-2 pt-2 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono flex items-center gap-2">
            <Factory className="w-3 h-3" /> NCM — nomenclatura do produto (MDIC)
          </p>
          <div className="space-y-1">
            {ncm.slice(0, 6).map((n: any, i: number) => (
              <a
                key={i}
                href={`https://www4.receita.fazenda.gov.br/simulador/PesquisarAliquotas.jsp?NCM=${n.code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 bg-muted/20 rounded hover:bg-muted/40 transition-colors"
              >
                <span className="text-[10px] font-mono font-bold text-amber-400 flex-shrink-0 w-16">{n.code}</span>
                <span className="text-xs text-foreground flex-1 truncate">{n.description}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              </a>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground">
            Fonte: NCM/MDIC · ComexStat · Receita Federal — relevante para COMEX Stat, Lei da Informática, ANVISA
          </p>
        </div>
      )}
    </div>
  );
}
