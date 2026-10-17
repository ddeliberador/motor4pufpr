// Sonda temporária: testa alcance de fontes de CNPJ a partir do backend.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

async function testar(url: string, metodo = "GET") {
  const t = Date.now();
  try {
    const r = await fetch(url, { method: metodo, headers: { "User-Agent": "Motor4P-UFPR/1.0" }, signal: AbortSignal.timeout(20000) });
    const hdr: Record<string, string> = {};
    r.headers.forEach((v, k) => { if (/rate|limit|retry|content-length|content-type|server/i.test(k)) hdr[k] = v; });
    const corpo = metodo === "HEAD" ? "" : (await r.text()).slice(0, 1500);
    return { url, status: r.status, ms: Date.now() - t, hdr, corpo };
  } catch (e) { return { url, erro: String(e), ms: Date.now() - t }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const cnpjs = ["00000000000191", "33000167000101", "60701190000104", "07628528000159", "00394460005887"];
  const rajada = [];
  for (const c of cnpjs) rajada.push(await testar(`https://brasilapi.com.br/api/cnpj/v1/${c}`));
  const paralelo = await Promise.all(Array.from({ length: 10 }, (_, i) => testar(`https://brasilapi.com.br/api/cnpj/v1/${cnpjs[i % 5]}`)));
  const cep = [await testar("https://brasilapi.com.br/api/cep/v2/80060000"), await testar("https://brasilapi.com.br/api/cep/v2/01310100")];
  const receita = [
    await testar("https://arquivos.receitafederal.gov.br/dados/cnpj/dados_abertos_cnpj/"),
    await testar("https://dadosabertos.rfb.gov.br/CNPJ/dados_abertos_cnpj/"),
  ];
  return Response.json({ rajada, paralelo: paralelo.map(p => ({ status: p.status, ms: p.ms, hdr: p.hdr, erro: p.erro })), cep, receita }, { headers: corsHeaders });
});
