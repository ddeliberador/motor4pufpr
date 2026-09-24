import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeHttpUrl } from "@/lib/utils";

interface Politica {
  id: string;
  nome: string;
  orgao: string;
  ano: string;
  status: string;
  investimento: string;
  investimento_publico_brl?: number;
  instrumento: string;
  conexao_mapa: string;
  link: string;
}

interface LayerPoliticas {
  layer: string;
  nome: string;
  cor: string;
  politicas: Politica[];
}

interface PoliticasResponse {
  layers?: LayerPoliticas[];
}

interface Props {
  layersAtivas: string[];
  onFechar: () => void;
}

const COR_BADGE: Record<string, string> = {
  pink: "border-pink-500/30 bg-pink-500/15 text-pink-400",
  orange: "border-orange-500/30 bg-orange-500/15 text-orange-400",
  yellow: "border-yellow-500/30 bg-yellow-500/15 text-yellow-400",
  teal: "border-teal-500/30 bg-teal-500/15 text-teal-400",
  violet: "border-violet-500/30 bg-violet-500/15 text-violet-400",
};

const COR_MARCADOR: Record<string, string> = {
  pink: "bg-pink-400",
  orange: "bg-orange-400",
  yellow: "bg-yellow-400",
  teal: "bg-teal-400",
  violet: "bg-violet-400",
};

function statusClass(status: string) {
  if (status.startsWith("Ativa")) return "text-green-400";
  if (status.includes("tramitação")) return "text-yellow-400";
  return "text-muted-foreground";
}

function totalInvestimentoPublico(layer: LayerPoliticas) {
  const valores = layer.politicas
    .map((politica) => politica.investimento_publico_brl)
    .filter((valor): valor is number => typeof valor === "number" && Number.isFinite(valor));
  if (valores.length === 0) return null;

  const totalBilhoes = valores.reduce((total, valor) => total + valor, 0) / 1_000_000_000;
  const formatado = `R$ ${totalBilhoes.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bilhões`;
  return valores.length === layer.politicas.length ? formatado : `${formatado} conhecidos`;
}

export default function PainelPoliticas({ layersAtivas, onFechar }: Props) {
  const [dados, setDados] = useState<LayerPoliticas[]>([]);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/politicas-layers.json", { signal: controller.signal })
      .then(async (resposta) => {
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        const payload = (await resposta.json()) as PoliticasResponse;
        if (!Array.isArray(payload.layers)) throw new Error("formato inválido");
        setDados(payload.layers);
      })
      .catch((falha: unknown) => {
        if (falha instanceof DOMException && falha.name === "AbortError") return;
        const mensagem = falha instanceof Error ? falha.message : "falha desconhecida";
        console.error("Políticas públicas do Mapa indisponíveis:", falha);
        setErro(mensagem);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });

    return () => controller.abort();
  }, []);

  const visiveis = useMemo(
    () => dados.filter(
      (layer) => layersAtivas.includes(layer.layer) || (layer.layer === "SNI" && layersAtivas.length > 0),
    ),
    [dados, layersAtivas],
  );

  const totalPoliticas = visiveis.reduce((total, layer) => total + layer.politicas.length, 0);

  return (
    <aside
      aria-label="Políticas públicas por camada"
      className="absolute bottom-8 right-3 z-30 w-[calc(100%-1.5rem)] max-w-80 overflow-hidden rounded-lg border border-border bg-card/95 shadow-lg backdrop-blur transition-all"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-violet-400" />
          <span className="truncate text-xs font-semibold text-foreground">Políticas públicas ativas</span>
          {!carregando && !erro && (
            <span className="shrink-0 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-400">
              {totalPoliticas}
            </span>
          )}
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((valor) => !valor)}
            className="h-6 w-6 text-muted-foreground"
            aria-label={collapsed ? "Expandir painel de políticas" : "Recolher painel de políticas"}
            title={collapsed ? "Expandir" : "Recolher"}
          >
            {collapsed ? <ChevronUp /> : <ChevronDown />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onFechar}
            className="h-6 w-6 text-muted-foreground"
            aria-label="Fechar painel de políticas"
            title="Fechar"
          >
            <X />
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="max-h-[min(60vh,32rem)] overflow-y-auto overscroll-contain">
          {carregando && (
            <div className="flex items-center justify-center gap-2 px-3 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Carregando políticas…
            </div>
          )}

          {erro && (
            <p className="px-3 py-4 text-xs text-destructive">
              Políticas públicas indisponíveis: {erro}
            </p>
          )}

          {!carregando && !erro && visiveis.map((layer) => (
            <section key={layer.layer} className="border-b border-border/50 last:border-0">
              <div className="flex items-center gap-2 px-3 py-1.5">
                <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${COR_BADGE[layer.cor] ?? COR_BADGE.teal}`}>
                  {layer.layer}
                </span>
                <span className="text-[11px] font-medium text-foreground">{layer.nome}</span>
                {totalInvestimentoPublico(layer) && (
                  <span className="text-[10px] font-semibold text-emerald-400">
                    {totalInvestimentoPublico(layer)}
                  </span>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground">{layer.politicas.length}</span>
              </div>

              {layer.politicas.map((politica) => {
                const estaExpandida = expandido === politica.id;
                const href = safeHttpUrl(politica.link);
                return (
                  <div key={politica.id} className="border-t border-border/30">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setExpandido(estaExpandida ? null : politica.id)}
                      aria-expanded={estaExpandida}
                      className="h-auto w-full justify-start gap-2 whitespace-normal rounded-none px-3 py-2 text-left hover:bg-muted/50"
                    >
                      <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${COR_MARCADOR[layer.cor] ?? COR_MARCADOR.teal}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-medium leading-tight text-foreground">
                          {politica.nome}
                        </span>
                        <span className="mt-0.5 block text-[10px] font-semibold leading-tight text-emerald-400">
                          {politica.investimento}
                        </span>
                      </span>
                      {estaExpandida ? <ChevronUp className="mt-0.5" /> : <ChevronDown className="mt-0.5" />}
                    </Button>

                    {estaExpandida && (
                      <div className="mx-3 mb-2 space-y-1.5 rounded-lg border border-border bg-muted/30 p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[10px] font-medium ${statusClass(politica.status)}`}>
                            ● {politica.status}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">{politica.ano}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          <span className="font-medium text-foreground">Órgão:</span> {politica.orgao}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          <span className="font-medium text-foreground">Instrumento:</span> {politica.instrumento}
                        </p>
                        <p className="border-l-2 border-violet-400/50 pl-2 text-[10px] italic text-muted-foreground">
                          {politica.conexao_mapa}
                        </p>
                        {href && (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                          >
                            Ver política completa <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          ))}

          {!carregando && !erro && (
            <div className="px-3 py-2 text-center text-[9px] text-muted-foreground/60">
              Curadoria: Motor da Inovação · UFPR/PPGPP · 2026
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
