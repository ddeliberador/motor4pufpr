import { useState, useEffect } from "react";
import { ExternalLink, Clock, Zap, TrendingUp, Handshake, Receipt, ChevronDown, ChevronUp, MapPin, RefreshCw } from "lucide-react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";

interface MuralOportunidadesProps {
  query: string;
  uf?: string;
  ufNome?: string;
  searchTerms?: string[];
}

const URGENCIA_CONFIG = {
  urgente: { cor: "border-red-500/40 bg-red-500/5", badge: "bg-red-500 text-white", label: "🔴 Encerra em breve", textCor: "text-red-500" },
  proximo: { cor: "border-amber-500/40 bg-amber-500/5", badge: "bg-amber-500 text-white", label: "🟡 Prazo próximo", textCor: "text-amber-500" },
  normal: { cor: "border-border/60", badge: "bg-muted text-muted-foreground", label: "🟢 Aberto", textCor: "text-emerald-500" },
};

const TIPO_CONFIG = {
  pregao: { icon: Receipt, cor: "text-blue-500", bg: "bg-blue-500/10", label: "Pregão / Licitação" },
  financiamento: { icon: TrendingUp, cor: "text-emerald-500", bg: "bg-emerald-500/10", label: "Financiamento" },
  parceria: { icon: Handshake, cor: "text-violet-500", bg: "bg-violet-500/10", label: "Parceria" },
  incentivo: { icon: Zap, cor: "text-amber-500", bg: "bg-amber-500/10", label: "Incentivo fiscal" },
  edital: { icon: Receipt, cor: "text-cyan-500", bg: "bg-cyan-500/10", label: "Edital / Chamada" },
};

type FiltroTipo = "todos" | "pregao" | "financiamento" | "parceria" | "incentivo";

function OportunidadeCard({ op, index }: { op: any; index: number }) {
  const [expandido, setExpandido] = useState(index < 2);
  const urgencia = URGENCIA_CONFIG[op.prazo_urgencia as keyof typeof URGENCIA_CONFIG] || URGENCIA_CONFIG.normal;
  const tipo = TIPO_CONFIG[op.tipo as keyof typeof TIPO_CONFIG] || TIPO_CONFIG.edital;
  const Icon = tipo.icon;

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${urgencia.cor}`}>
      <button onClick={() => setExpandido(e => !e)} className="w-full text-left p-4 hover:bg-muted/40 transition-colors">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl ${tipo.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
            <Icon className={`w-4 h-4 ${tipo.cor}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${urgencia.badge}`}>
                {urgencia.label}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {tipo.label}
              </span>
              {op.destaque_local && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" /> Regional
                </span>
              )}
            </div>

            <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{op.titulo}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{op.orgao}</p>

            <div className="flex flex-wrap gap-3 mt-2">
              {op.valor > 0 && (
                <span className="text-xs font-bold text-primary">
                  R$ {op.valor >= 1e6 ? `${(op.valor / 1e6).toFixed(1)}M` : `${(op.valor / 1e3).toFixed(0)}k`}
                </span>
              )}
              {op.valor_total && !op.valor && (
                <span className="text-xs font-bold text-emerald-600">{op.valor_total}</span>
              )}
              {!op.valor_total && op.valor_max && !op.valor && (
                <span className="text-xs text-muted-foreground">{op.valor_max}</span>
              )}
              {op.dias_restantes != null && op.dias_restantes > 0 && (
                <span className={`text-xs font-semibold flex items-center gap-1 ${urgencia.textCor}`}>
                  <Clock className="w-3 h-3" />
                  {op.dias_restantes} dia{op.dias_restantes !== 1 ? "s" : ""}
                </span>
              )}
              {op.uf && <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{op.uf}</span>}
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center gap-2 mt-1">
            {expandido ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </button>

      {expandido && (
        <div className="border-t border-border/30 px-4 pb-4 pt-3 space-y-3 bg-background/50">
          {/* Verba em destaque */}
          {op.valor_total && (
            <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3">
              <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider mb-0.5">💰 Verba disponível</p>
              <p className="text-base font-bold text-foreground">{op.valor_total}</p>
              {op.valor_por_projeto && op.valor_por_projeto !== op.valor_total && (
                <p className="text-xs text-muted-foreground mt-0.5">Por projeto: {op.valor_por_projeto}</p>
              )}
            </div>
          )}

          {op.descricao && (
            <p className="text-sm text-muted-foreground leading-relaxed">{op.descricao}</p>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {op.cnpj_elegivel && <span>✅ Elegível: {op.cnpj_elegivel}</span>}
            {op.regime_tributario && op.regime_tributario !== "Qualquer" && (
              <span>📋 Regime: {op.regime_tributario}</span>
            )}
            {op.modalidade && <span>📄 {op.modalidade}</span>}
            {op.data_encerramento && <span>📅 Encerra: {op.data_encerramento}</span>}
            {op.data_publicacao && <span>📌 Publicado: {op.data_publicacao}</span>}
          </div>

          {op.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {op.tags.map((tag: string, i: number) => (
                <span key={i} className="text-[10px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground">{tag}</span>
              ))}
            </div>
          )}

          <a href={op.url} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
            <ExternalLink className="w-4 h-4" />
            {op.tipo === "pregao" ? "Ver edital completo" : op.tipo === "financiamento" ? "Acessar linha de crédito" : "Saiba mais"}
          </a>
        </div>
      )}
    </div>
  );
}

export default function MuralOportunidades({ query, uf, ufNome, searchTerms }: MuralOportunidadesProps) {
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroTipo>("todos");

  const carregar = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("layer-oportunidades", {
        body: { query, uf: uf || "", search_terms: searchTerms || [] },
      });
      if (!error && data && !data.error) setDados(data);
    } catch (e) {
      console.warn("Mural oportunidades error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, [query, uf]);

  const todasOps = dados ? [
    ...(dados.pregoes_abertos || []),
    ...(dados.linhas_financiamento || []).filter((l: any) => l.destaque_local),
    ...(dados.linhas_financiamento || []).filter((l: any) => !l.destaque_local),
    ...(dados.chamadas_abertas || []).slice(0, 3),
  ] : [];

  const filtradas = filtro === "todos"
    ? todasOps
    : todasOps.filter((op: any) => op.tipo === filtro);

  const urgentes = todasOps.filter((op: any) => op.prazo_urgencia === "urgente").length;
  const proximas = todasOps.filter((op: any) => op.prazo_urgencia === "proximo").length;

  const FILTROS: { key: FiltroTipo; label: string; count: number }[] = [
    { key: "todos", label: "Todas", count: todasOps.length },
    { key: "pregao", label: "📋 Pregões", count: todasOps.filter((o: any) => o.tipo === "pregao").length },
    { key: "financiamento", label: "💰 Financiamento", count: todasOps.filter((o: any) => o.tipo === "financiamento").length },
    { key: "parceria", label: "🤝 Parcerias", count: todasOps.filter((o: any) => o.tipo === "parceria").length },
    { key: "incentivo", label: "⚡ Incentivos", count: todasOps.filter((o: any) => o.tipo === "incentivo").length },
  ];

  return (
    <div className="bg-card border-2 border-primary/15 rounded-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50 px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">🎯 Mural de Oportunidades</h2>
              <p className="text-xs text-muted-foreground">
                {uf ? `${ufNome || uf} + nacional` : "Nacional"} · tema: <strong>{query}</strong>
              </p>
            </div>
          </div>
          <button onClick={carregar} disabled={loading}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-40"
            title="Atualizar">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Banner de verba disponível */}
        {!loading && dados && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-3">
            <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1">💰 Dinheiro na mesa em 2026</p>
            <p className="text-sm font-bold text-foreground">
              R$ 3,6 bilhões+ em subvenção Finep
              <span className="text-xs font-normal text-muted-foreground ml-2">sem devolução · editais abertos</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              + crédito BNDES permanente · Lei do Bem (R$ 11,98bi deduzidos em 2024) · EMBRAPII sem edital
            </p>
          </div>
        )}

        {/* Alertas de urgência */}
        {!loading && (urgentes > 0 || proximas > 0) && (
          <div className="flex gap-2 flex-wrap">
            {urgentes > 0 && (
              <span className="text-xs px-3 py-1 bg-red-500 text-white rounded-full font-semibold">
                🔴 {urgentes} encerrando em breve
              </span>
            )}
            {proximas > 0 && (
              <span className="text-xs px-3 py-1 bg-amber-500 text-white rounded-full font-semibold">
                🟡 {proximas} no próximo mês
              </span>
            )}
          </div>
        )}
      </div>


      {!loading && todasOps.length > 0 && (
        <div className="flex gap-1 px-4 py-3 border-b border-border/30 overflow-x-auto">
          {FILTROS.filter(f => f.count > 0 || f.key === "todos").map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                filtro === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}>
              {f.label} <span className="opacity-70 ml-1">({f.count})</span>
            </button>
          ))}
        </div>
      )}

      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Buscando oportunidades em {uf ? `${uf} e` : ""} bases federais...</p>
          </div>
        ) : filtradas.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3 items-start">
            {filtradas.map((op: any, i: number) => (
              <OportunidadeCard key={i} op={op} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm font-medium text-foreground mb-1">Nenhuma oportunidade encontrada para este filtro</p>
            <button onClick={() => setFiltro("todos")} className="text-xs text-primary hover:underline">Ver todas →</button>
          </div>
        )}

        {!loading && todasOps.length > 0 && (
          <p className="text-[10px] text-muted-foreground text-center mt-4 pt-3 border-t border-border/30">
            Fontes: PNCP · Curadoria Motor da Inovação · dados.gov.br · Atualizado em tempo real
          </p>
        )}
      </div>
    </div>
  );
}
