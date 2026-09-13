import { safeSupabase as supabase } from "@/lib/supabaseClient";
import { hasConsent } from "@/lib/consent";

/**
 * Telemetria de pesquisa do Motor da Inovação.
 *
 * Regras de design, para manter isso defensável perante o CEP:
 * - INTERRUPTOR GERAL: enquanto TELEMETRY_ENABLED === false, nada é coletado.
 * - Nenhum evento sai sem hasConsent() === true.
 * - Nenhum campo de texto livre do usuário é enviado (nem termo de busca,
 *   nem comentários). Só categorias, números e booleanos curtos.
 * - O session_id é aleatório, gerado no cliente, sem vínculo com identidade.
 * - Eventos são enviados em lote para reduzir custo de rede.
 * - O banco também descarta strings longas antes de gravar (defesa em camadas).
 */

/** Ligar somente após o banner de consentimento ser aprovado pelo CEP. */
export const TELEMETRY_ENABLED = false;

const SESSION_KEY = "motor_inovacao_session_id";
const FLUSH_INTERVAL_MS = 5000;
const MAX_STRING_LEN = 40;

export type EventType =
  | "pillar_view" // { tab: string, persona: string }
  | "persona_selected" // { persona: string, has_uf: boolean, cnae_count: number }
  | "result_opened" // { result_type: string, depth: "summary" | "detail" }
  | "export_action" // { format: "pdf" | "csv" | "share_link", scope: string }
  | "microfeedback_submitted"; // { useful: boolean, comment_length: number }

type Payload = Record<string, string | number | boolean>;

interface TelemetryEvent {
  session_id: string;
  event_type: EventType;
  payload: Payload;
  client_ts: string;
}

let queue: TelemetryEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function startFlushLoop() {
  if (flushTimer || typeof window === "undefined") return;
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  window.addEventListener("beforeunload", () => { void flush(); });
}

/** Remove qualquer valor que possa carregar texto livre. */
function sanitize(payload: Payload): Payload {
  const clean: Payload = {};
  for (const [k, v] of Object.entries(payload || {})) {
    if (typeof v === "string" && v.length > MAX_STRING_LEN) continue;
    if (typeof v === "object" || v === null || v === undefined) continue;
    clean[k] = v;
  }
  return clean;
}

async function flush() {
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  try {
    await supabase.from("telemetry_events").insert(
      batch.map((e) => ({
        session_id: e.session_id,
        event_type: e.event_type,
        payload: e.payload,
        client_ts: e.client_ts,
      })) as never,
    );
  } catch {
    // Falha de envio nunca deve quebrar a experiência do usuário.
  }
}

/**
 * Registra um evento de uso. Não faz nada se a coleta estiver desligada
 * ou se o usuário não tiver consentido.
 */
export function track(event_type: EventType, payload: Payload = {}) {
  if (!TELEMETRY_ENABLED) return;
  if (typeof window === "undefined") return;
  if (!hasConsent()) return;
  startFlushLoop();
  queue.push({
    session_id: getSessionId(),
    event_type,
    payload: sanitize(payload),
    client_ts: new Date().toISOString(),
  });
}

/**
 * Microfeedback: separa explicitamente o comentário livre para reforçar, no
 * próprio código, que ele nunca vai para o payload de telemetria. O texto do
 * comentário segue pelo canal próprio (community_feedback), com consentimento
 * específico, e não por aqui.
 */
export function trackMicrofeedback(useful: boolean, commentText?: string) {
  track("microfeedback_submitted", {
    useful,
    comment_length: commentText?.length ?? 0,
  });
}
