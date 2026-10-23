// Gestão da Pesquisa → Coletas: dispara e acompanha as séries municipais das
// Camadas de IA (ADR-0003) sem terminal. Fala com a função coletas-municipais,
// que repassa ao backend do Railway com a chave institucional.

import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Fontes = Record<string, { job: string; tipo?: string; indicadores: string[]; doc: string }>;
interface Estado { fontes: Fontes; em_andamento: Record<string, number>; ultimos: Record<string, Record<string, unknown>> }

const ORDEM = ["ibge_pop", "capes_ppg", "anatel_bl", "aneel_gd", "cnpj_cnae", "openalex_coautoria"];
const DURACAO: Record<string, string> = {
  ibge_pop: "minutos", capes_ppg: "minutos", anatel_bl: "dezenas de minutos", aneel_gd: "dezenas de minutos", cnpj_cnae: "uma a duas horas (dez arquivos de ~1 GB)",
  openalex_coautoria: "dezenas de minutos (uma consulta por instituição e ano)",
};

export default function ColetasMunicipais() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [agenda, setAgenda] = useState<{ job: string; ultima_execucao: string | null; ultimo_status: string | null; ultima_mensagem: string | null }[]>([]);

  const carregar = useCallback(async () => {
    setErro(null);
    const { data, error } = await supabase.functions.invoke("coletas-municipais", { body: {} });
    if (error || data?.error) { setErro(error?.message ?? String(data?.error)); return; }
    setEstado(data as Estado);
    const { data: ag } = await supabase.from("agenda_coletas").select("job,ultima_execucao,ultimo_status,ultima_mensagem").or("job.like.series-municipais:%,job.like.interacoes:%");
    setAgenda(ag ?? []);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  // Enquanto algo roda, atualiza a cada 20 s.
  useEffect(() => {
    if (!estado || !Object.keys(estado.em_andamento).length) return;
    const t = setInterval(carregar, 20_000);
    return () => clearInterval(t);
  }, [estado, carregar]);

  const disparar = async (fonte: string, simular: boolean) => {
    setOcupado(fonte);
    setErro(null);
    const { data, error } = await supabase.functions.invoke("coletas-municipais", { body: { acao: "disparar", fonte, simular, amostra: simular ? 200_000 : undefined } });
    setOcupado(null);
    if (error || data?.error) { setErro(error?.message ?? String(data?.error)); return; }
    await carregar();
  };

  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR") : "nunca");

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Coletas municipais das Camadas de IA</h2>
          <p className="text-sm text-muted-foreground">
            Cada fonte é baixada e agregada por município no backend (Railway) e gravada na camada temporal. "Testar" lê uma amostra e não grava nada; "Coletar" faz a carga completa. Ordem sugerida: de cima para baixo.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={carregar}><RefreshCw className="mr-1 h-4 w-4" /> Atualizar</Button>
      </div>
      {erro && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>}
      {!estado && !erro && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> consultando o backend…</p>}
      {estado && (
        <div className="divide-y divide-border rounded-lg border border-border">
          {ORDEM.filter((f) => estado.fontes[f]).map((f) => {
            const info = estado.fontes[f];
            const rodando = estado.em_andamento[f];
            const ultimo = estado.ultimos[f];
            const ag = agenda.find((a) => a.job === info.job);
            return (
              <div key={f} className="flex flex-col gap-2 p-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{info.doc} <span className="font-mono text-[11px] text-muted-foreground">{f}</span></p>
                  <p className="text-xs text-muted-foreground">{info.tipo === "interacoes" ? "Grava na tabela de interações (aba Interação do Mapa)" : `Indicadores: ${info.indicadores.join(", ")}`} · duração típica: {DURACAO[f]}</p>
                  <p className="text-xs text-muted-foreground">
                    Última execução: {fmt(ag?.ultima_execucao ?? null)}{ag?.ultimo_status ? ` · ${ag.ultimo_status}` : ""}{ag?.ultima_mensagem ? ` · ${ag.ultima_mensagem}` : ""}
                  </p>
                  {rodando != null && <p className="text-xs text-amber-500">Em andamento há {Math.round(rodando / 60)} min…</p>}
                  {ultimo && (
                    <details className="mt-1 text-xs">
                      <summary className={`cursor-pointer ${ultimo.ok ? "text-emerald-500" : "text-destructive"}`}>
                        {ultimo.ok ? "Último resultado desta sessão do backend" : `Falhou: ${String(ultimo.erro ?? "")}`}
                      </summary>
                      <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-2 text-[11px]">{JSON.stringify(ultimo, null, 2)}</pre>
                    </details>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" disabled={!!ocupado || rodando != null} onClick={() => disparar(f, true)}>Testar</Button>
                  <Button size="sm" disabled={!!ocupado || rodando != null} onClick={() => disparar(f, false)}>
                    {ocupado === f ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="mr-1 h-4 w-4" />} Coletar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Os resultados aparecem no Mapa (aba Camadas de IA, nível municipal) assim que a carga termina. O backend guarda só o resultado da sessão atual; o histórico fica em <code>ingest_runs</code> e <code>agenda_coletas</code>.
      </p>
    </div>
  );
}
