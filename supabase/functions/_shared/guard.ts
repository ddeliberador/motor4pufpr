// Proteções compartilhadas pelas funções de IA:
// limite de tamanho de payload, validação de strings e rate limit por IP.

export const MAX_BODY_BYTES = 64 * 1024; // 64 KB

export interface GuardOk<T> { ok: true; body: T }
export interface GuardFail { ok: false; response: Response }
export type GuardResult<T> = GuardOk<T> | GuardFail;

function json(body: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return (fwd.split(",")[0] || req.headers.get("cf-connecting-ip") || "unknown").trim().slice(0, 64);
}

/** Valida que o valor é string curta (ou ausente). */
export function isShortString(v: unknown, max: number): boolean {
  if (v === undefined || v === null) return true;
  return typeof v === "string" && v.length <= max && v.trim().length > 0;
}

/**
 * Rate limit por IP com janela deslizante, persistido em public.ai_rate_limits.
 * Falha aberta (permite) se não houver service role — não bloqueia o fluxo atual.
 */
export async function checkRateLimit(
  fn: string,
  ip: string,
  limit = 20,
  windowSeconds = 300,
): Promise<{ allowed: boolean; retryAfter: number }> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return { allowed: true, retryAfter: 0 };

  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

  try {
    const res = await fetch(
      `${url}/rest/v1/ai_rate_limits?select=id&fn=eq.${encodeURIComponent(fn)}&ip=eq.${encodeURIComponent(ip)}&created_at=gte.${since}`,
      { headers: { ...headers, Prefer: "count=exact", Range: "0-0" }, signal: AbortSignal.timeout(4000) },
    );
    const range = res.headers.get("content-range") || "";
    const count = Number(range.split("/")[1] || 0);
    if (Number.isFinite(count) && count >= limit) {
      return { allowed: false, retryAfter: windowSeconds };
    }
    // Registra a chamada atual e limpa registros antigos (sem bloquear a resposta).
    await fetch(`${url}/rest/v1/ai_rate_limits`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ fn, ip }),
      signal: AbortSignal.timeout(4000),
    });
    fetch(`${url}/rest/v1/ai_rate_limits?created_at=lt.${new Date(Date.now() - 86_400_000).toISOString()}`, {
      method: "DELETE",
      headers: { ...headers, Prefer: "return=minimal" },
    }).catch(() => {});
    return { allowed: true, retryAfter: 0 };
  } catch (_e) {
    return { allowed: true, retryAfter: 0 };
  }
}

/**
 * Lê e valida o corpo da requisição: rejeita >64 KB (413), JSON inválido (400)
 * e aplica rate limit por IP (429).
 */
export async function guardRequest<T = Record<string, unknown>>(
  req: Request,
  fn: string,
  corsHeaders: Record<string, string>,
  opts: { limit?: number; windowSeconds?: number } = {},
): Promise<GuardResult<T>> {
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) {
    return { ok: false, response: json({ error: "Payload muito grande (máximo 64 KB)" }, 413, corsHeaders) };
  }

  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return { ok: false, response: json({ error: "Payload muito grande (máximo 64 KB)" }, 413, corsHeaders) };
  }

  let body: T;
  try {
    body = raw ? JSON.parse(raw) : ({} as T);
  } catch {
    return { ok: false, response: json({ error: "JSON inválido" }, 400, corsHeaders) };
  }

  const b = body as Record<string, unknown>;
  const checks: Array<[string, unknown, number]> = [
    ["query", b.query, 200],
    ["scenario", b.scenario, 1000],
    ["persona", b.persona, 40],
  ];
  const entity = (b.entityContext || {}) as Record<string, unknown>;
  checks.push(["entityName", entity.entityName, 160]);
  checks.push(["location", entity.location, 160]);
  checks.push(["govLevel", entity.govLevel, 40]);

  for (const [name, value, max] of checks) {
    if (!isShortString(value, max)) {
      return {
        ok: false,
        response: json({ error: `Campo "${name}" inválido: deve ser texto de até ${max} caracteres` }, 400, corsHeaders),
      };
    }
  }

  const ip = clientIp(req);
  const rl = await checkRateLimit(fn, ip, opts.limit ?? 20, opts.windowSeconds ?? 300);
  if (!rl.allowed) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Muitas requisições. Aguarde alguns minutos e tente novamente." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retryAfter) } },
      ),
    };
  }

  return { ok: true, body };
}
