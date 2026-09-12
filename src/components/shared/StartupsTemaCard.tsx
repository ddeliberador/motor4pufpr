import { useEffect, useState } from "react";
import { Rocket, ExternalLink, MapPin, AlertTriangle } from "lucide-react";
import { safeHttpUrl } from "@/lib/utils";
import {
  fetchStartupsRelacionadas,
  FONTE_LABEL,
  type StartupRelacionada,
} from "@/lib/researchLocations";

interface Props {
  tema: string;
  uf?: string;
  ufNome?: string;
}

const LIMITE_CARDS = 12;

/**
 * Startups do Mapeamento Nacional ABStartups 2025 relacionadas ao tema pesquisado.
 * Casamento literal por palavras-chave (nome ou segmento) — transparente e sem
 * inferência: as palavras usadas ficam visíveis para o usuário.
 */
export default function StartupsTemaCard({ tema, uf, ufNome }: Props) {
  const [resultado, setResultado] = useState<{ startups: StartupRelacionada[]; palavras: string[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    setResultado(null);
    setErro(null);
    setShowAll(false);
    if (!tema?.trim()) return;
    (async () => {
      try {
        const r = await fetchStartupsRelacionadas(tema);
        if (active) setResultado(r);
      } catch (e) {
        if (active) setErro(e instanceof Error ? e.message : "Falha ao consultar startups relacionadas.");
      }
    })();
    return () => { active = false; };
  }, [tema]);

  if (!tema?.trim()) return null;

  if (erro) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
          <p>Não foi possível cruzar o tema com a base de startups: {erro}</p>
        </div>
      </div>
    );
  }

  if (resultado === null) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="h-16 animate-pulse bg-muted/40 rounded-xl" />
      </div>
    );
  }

  const { startups, palavras } = resultado;
  if (startups.length === 0) return null;

  // Startups do estado pesquisado aparecem primeiro; o restante é nacional.
  const ordenadas = [...startups].sort((a, b) => {
    const au = uf && a.uf === uf ? 0 : 1;
    const bu = uf && b.uf === uf ? 0 : 1;
    return au - bu;
  });
  const noEstado = uf ? startups.filter((s) => s.uf === uf).length : 0;
  const segmentos = [...new Set(startups.map((s) => s.segmento).filter(Boolean))] as string[];
  const visiveis = showAll ? ordenadas : ordenadas.slice(0, LIMITE_CARDS);

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Rocket className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Startups relacionadas ao tema “{tema}”</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {startups.length} startup{startups.length > 1 ? "s" : ""} encontrada{startups.length > 1 ? "s" : ""} no mapeamento nacional
            {uf ? ` — ${noEstado} em ${ufNome || uf}` : ""}
          </p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mb-3">
        Casamento literal por palavras-chave no nome ou no segmento da startup:{" "}
        {palavras.map((p) => (
          <span key={p} className="inline-block mr-1 mb-1 px-1.5 py-0.5 rounded bg-muted text-foreground/80">{p}</span>
        ))}
      </p>

      {segmentos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {segmentos.slice(0, 8).map((s) => (
            <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{s}</span>
          ))}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {visiveis.map((s) => (
          <div key={s.id} className={`border rounded-xl p-4 bg-background/50 ${uf && s.uf === uf ? "border-primary/40" : "border-border"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground leading-snug">{s.nome}</p>
                <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {s.segmento || "Segmento não informado"}
                </span>
                {(s.municipio || s.uf) && (
                  <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {[s.municipio, s.uf].filter(Boolean).join(" · ")}
                    {uf && s.uf === uf && <span className="text-primary font-medium">(seu estado)</span>}
                  </p>
                )}
              </div>
              {s.fonte_url && (
                <a href={safeHttpUrl(s.fonte_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline inline-flex items-center gap-0.5 flex-shrink-0">
                  Site <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {ordenadas.length > LIMITE_CARDS && (
        <button onClick={() => setShowAll((v) => !v)} className="mt-3 text-xs text-primary underline">
          {showAll ? "Mostrar menos" : `Ver todas as ${ordenadas.length} startups relacionadas`}
        </button>
      )}

      <p className="text-[11px] text-muted-foreground mt-4">
        📌 Fonte: {FONTE_LABEL.abstartups_2025}. O cruzamento é textual (nome/segmento), não semântico —
        startups do tema que não usem essas palavras não aparecem.
      </p>
    </div>
  );
}
