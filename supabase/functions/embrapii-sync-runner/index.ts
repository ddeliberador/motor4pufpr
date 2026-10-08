// Função temporária: executa embrapii-sync com a chave interna e grava a chave no Vault.
// Será removida após a configuração do agendamento.
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const key = Deno.env.get("EMBRAPII_SYNC_KEY");
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!key) {
    return new Response(JSON.stringify({ ok: false, erro: "EMBRAPII_SYNC_KEY ausente" }), { status: 500 });
  }

  // 1. Guarda a chave no Vault (idempotente: remove versão anterior com o mesmo nome)
  const supabase = createClient(url, serviceKey);
  const { data: existing } = await supabase.rpc("vault_read_secret_by_name", { nome: "embrapii_sync_key" }).maybeSingle();
  let vaultInfo: unknown = "já existia";
  if (!existing) {
    const { data, error } = await supabase.rpc("vault_store_secret", { segredo: key, nome: "embrapii_sync_key" });
    vaultInfo = error ? { erro: error.message } : { vault_id: data };
  }

  // 2. Executa a sincronização
  const resp = await fetch(`${url}/functions/v1/embrapii-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-sync-key": key },
    body: "{}",
  });
  const corpo = await resp.text();
  return new Response(JSON.stringify({ status: resp.status, vault: vaultInfo, resposta: JSON.parse(corpo) }), {
    status: resp.status,
    headers: { "Content-Type": "application/json" },
  });
});
