import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, ChevronDown, ChevronUp, Loader2, Map, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Entry = {
  id: string;
  data: string;
  categoria: string;
  titulo: string;
  descricao: string | null;
  fonte: string | null;
  dificuldade: string | null;
  resolucao: string | null;
  nota_desenvolvimento: string | null;
  eh_achado_pesquisa: boolean | null;
  eh_mapa_inovacao: boolean | null;
};

const CAT_LABEL: Record<string, string> = {
  fonte_de_dado: "FONTE ADICIONADA",
  decisao_arquitetura: "DECISÃO TOMADA",
  obstaculo_institucional: "OBSTÁCULO IDENTIFICADO",
  correcao_bug: "BUG CORRIGIDO",
  integracao_externa: "PARCERIA REGISTRADA",
};

const CAT_STYLE: Record<string, string> = {
  fonte_de_dado: "bg-blue-500/10 text-blue-400",
  decisao_arquitetura: "bg-violet-500/10 text-violet-400",
  obstaculo_institucional: "bg-amber-500/10 text-amber-400",
  correcao_bug: "bg-rose-500/10 text-rose-400",
  integracao_externa: "bg-teal-500/10 text-teal-400",
};

const fmtDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const isMapa = (e: Entry) => {
  if (e.eh_mapa_inovacao) return true;
  const hay = normalize(
    [e.titulo, e.descricao, e.fonte, e.dificuldade, e.resolucao, e.nota_desenvolvimento]
      .filter(Boolean)
      .join(" "),
  );
  return hay.includes("mapa da inovacao") || hay.includes("mapa brasileiro de inovacao");
};

function EntradaItem({ entrada, index, last }: { entrada: Entry; index: number; last: boolean }) {
  const [aberto, setAberto] = useState(index === 0);
  const mapa = isMapa(entrada);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index, 8) * 0.04 }}
      className="flex gap-4"
    >
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center">
          {entrada.eh_achado_pesquisa ? (
            <Sparkles className="w-4 h-4 text-amber-400" />
          ) : (
            <Calendar className="w-4 h-4 text-primary" />
          )}
        </div>
        {!last && <div className="w-px flex-1 bg-border/50 my-2" />}
      </div>

      <div className="flex-1 pb-6 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-xs text-muted-foreground">{fmtDate(entrada.data)}</span>
          <span
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-medium",
              CAT_STYLE[entrada.categoria] ?? "bg-muted text-muted-foreground",
            )}
          >
            {CAT_LABEL[entrada.categoria] ?? entrada.categoria}
          </span>
          {mapa && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary flex items-center gap-1">
              <Map className="w-3 h-3" /> MAPA DA INOVAÇÃO
            </span>
          )}
          {entrada.eh_achado_pesquisa && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-400">
              ACHADO DE PESQUISA
            </span>
          )}
        </div>

        <button onClick={() => setAberto((a) => !a)} className="w-full text-left group">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
              {entrada.titulo}
            </h3>
            {aberto ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            )}
          </div>
          {entrada.descricao && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-3">
              {entrada.descricao}
            </p>
          )}
        </button>

        {aberto && (
          <div className="mt-3 pl-3 border-l-2 border-primary/20 space-y-2">
            {entrada.descricao && (
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {entrada.descricao}
              </p>
            )}
            {entrada.fonte && (
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">Fonte: </span>
                {entrada.fonte}
              </p>
            )}
            {entrada.dificuldade && (
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">Dificuldade: </span>
                {entrada.dificuldade}
              </p>
            )}
            {entrada.resolucao && (
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">Solução: </span>
                {entrada.resolucao}
              </p>
            )}
            {entrada.nota_desenvolvimento && (
              <p className="text-xs text-amber-400/90">
                <span className="font-medium">Desenvolver na tese: </span>
                {entrada.nota_desenvolvimento}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function DiarioPesquisaLive() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [modo, setModo] = useState<"todas" | "mapa" | "achados">("todas");

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data, error } = await supabase
        .from("build_log")
        .select(
          "id,data,categoria,titulo,descricao,fonte,dificuldade,resolucao,nota_desenvolvimento,eh_achado_pesquisa,eh_mapa_inovacao",
        )
        .order("data", { ascending: false })
        .order("created_at", { ascending: false });
      if (!ativo) return;
      if (error) setErro(error.message);
      else setEntries((data ?? []) as Entry[]);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  if (erro) {
    return (
      <p className="text-sm text-rose-400">
        Não foi possível carregar o diário agora ({erro}). Tente recarregar a página.
      </p>
    );
  }

  if (!entries) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando registros…
      </div>
    );
  }

  const totalMapa = entries.filter(isMapa).length;
  const totalAchados = entries.filter((e) => e.eh_achado_pesquisa).length;

  const visiveis =
    modo === "mapa" ? entries.filter(isMapa)
    : modo === "achados" ? entries.filter((e) => e.eh_achado_pesquisa)
    : entries;

  const botoes = [
    { key: "todas" as const, label: `Todas (${entries.length})` },
    { key: "mapa" as const, label: `Mapa da Inovação (${totalMapa})` },
    { key: "achados" as const, label: `Achados de pesquisa (${totalAchados})` },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-8">
        {botoes.map((b) => (
          <button
            key={b.key}
            onClick={() => setModo(b.key)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition-colors",
              modo === b.key
                ? "bg-primary text-primary-foreground border-transparent"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {b.label}
          </button>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum registro nesta seleção.</p>
      ) : (
        <div className="space-y-0">
          {visiveis.map((e, i) => (
            <EntradaItem key={e.id} entrada={e} index={i} last={i === visiveis.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}
