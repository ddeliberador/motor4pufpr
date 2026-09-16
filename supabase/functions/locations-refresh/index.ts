// Gatilho diário: reprocessa as fontes automatizáveis de public.research_locations.
// Chamado pelo agendador (pg_cron) às 03:00 UTC = 00:00 em Brasília.
//
// Regras: trava de execução única, limite fixo de trabalho por execução,
// registro de cada fonte em public.ingest_runs, pausa após falhas repetidas.
// Falha nunca é silenciosa e nada é gravado quando a fonte falha.

import { corsHeaders } from "npm:@supabase/supabase-js@2.116.0/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_KEY = Deno.env.get("CRON_REFRESH_KEY") || "";
const INGEST_KEY = Deno.env.get("LOCATIONS_INGEST_KEY_ADMIN") || Deno.env.get("LOCATIONS_INGEST_KEY") || "";

const JOB_ID = "locations_daily";
const FONTES = ["openalex", "embrapii", "inep_censo_superior", "mcti_formict"] as const;
const LOCK_MINUTOS = 30;
const MAX_FALHAS = 3;

const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

async function lerJob() {
  const res = await rest(`ingest_jobs?id=eq.${JOB_ID}&select=*`);
  if (!res.ok) throw new Error(`ingest_jobs: ${await res.text()}`);
  const rows = await res.json();
  return rows[0] ?? null;
}

const atualizarJob = (patch: Record<string, unknown>) =>
  rest(`ingest_jobs?id=eq.${JOB_ID}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });

const registrarRun = (row: Record<string, unknown>) =>
  rest("ingest_runs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ job_id: JOB_ID, ...row }),
  });

async function registrarDiario(resumo: string, detalhe: string) {
  await rest("build_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      data: new Date().toISOString().slice(0, 10),
      titulo: resumo,
      descricao: detalhe,
      categoria: "integracao_externa",
      eh_mapa_inovacao: true,
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (!CRON_KEY) return json({ error: "Gatilho não configurado no servidor" }, 503);
  if ((req.headers.get("x-cron-key") || "") !== CRON_KEY) {
    return json({ error: "Header x-cron-key obrigatório ou inválido" }, 401);
  }
  if (!INGEST_KEY) return json({ error: "Chave de ingestão ausente no servidor" }, 503);

  const job = await lerJob();
  if (!job) return json({ error: `Job ${JOB_ID} não cadastrado` }, 500);

  if (job.paused) {
    return json({ skipped: true, reason: "pausado", pause_reason: job.pause_reason }, 200);
  }
  if (job.lock_until && new Date(job.lock_until) > new Date()) {
    return json({ skipped: true, reason: "execução anterior ainda em andamento" }, 200);
  }

  const agora = new Date();
  await atualizarJob({
    status: "running",
    last_started_at: agora.toISOString(),
    lock_until: new Date(agora.getTime() + LOCK_MINUTOS * 60_000).toISOString(),
  });

  const resultados: Array<Record<string, unknown>> = [];
  try {
    for (const fonte of FONTES) {
      const t0 = Date.now();
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/locations-ingest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
            "x-ingest-key": INGEST_KEY,
          },
          body: JSON.stringify({ source: fonte }),
          signal: AbortSignal.timeout(300_000),
        });
        const data = await res.json().catch(() => ({}));
        const ok = res.ok && data?.failed !== true;
        const linha = {
          fonte,
          ok,
          found: Number(data?.found ?? 0),
          inserted: Number(data?.inserted ?? 0),
          error: ok ? null : String(data?.error || `HTTP ${res.status}`),
          duration_ms: Date.now() - t0,
        };
        resultados.push(linha);
        await registrarRun(linha);
      } catch (e) {
        const linha = {
          fonte,
          ok: false,
          found: 0,
          inserted: 0,
          error: (e as Error).message,
          duration_ms: Date.now() - t0,
        };
        resultados.push(linha);
        await registrarRun(linha);
      }
    }

    const sucessos = resultados.filter((r) => r.ok).length;
    const falhas = resultados.length - sucessos;
    const falhasSeguidas = sucessos === 0 ? (job.consecutive_failures ?? 0) + 1 : 0;
    const pausar = falhasSeguidas >= MAX_FALHAS;

    await atualizarJob({
      status: falhas === 0 ? "ok" : "partial",
      last_finished_at: new Date().toISOString(),
      lock_until: null,
      consecutive_failures: falhasSeguidas,
      paused: pausar,
      pause_reason: pausar
        ? `pausado após ${falhasSeguidas} execuções seguidas sem nenhuma fonte coletada`
        : null,
    });

    const detalhe = resultados
      .map((r) => `${r.fonte}: ${r.ok ? `${r.inserted} registros` : `FALHA — ${r.error}`}`)
      .join("\n");
    await registrarDiario(
      `Coleta automática diária das bases do mapa (${sucessos}/${resultados.length} fontes)`,
      detalhe,
    );

    return json({ job: JOB_ID, sucessos, falhas, paused: pausar, resultados });
  } catch (e) {
    await atualizarJob({
      status: "error",
      last_finished_at: new Date().toISOString(),
      lock_until: null,
    });
    return json({ error: (e as Error).message, resultados }, 500);
  }
});
