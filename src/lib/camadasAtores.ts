// Camada de IA de cada ator do Mapa, lida da classificação do banco
// (`vw_ator_camada`, regras em `camada_regras`, as mesmas que a Análise mostra
// em "Como classificamos"). O Mapa não classifica por conta própria: todo ponto
// de ator pertence às camadas que as regras lhe dão; quem não cai em regra
// nenhuma fica em "Sem camada", visível na coluna, nunca escondido.
//
// Um ator pode estar em mais de uma camada (universidade com modelos: L6 e L4).
// Desenha-se uma vez, na camada principal: a de regra com maior confiança e,
// em empate, a de menor número (L1 antes de L6).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetchAll";
import type { CamadaIa } from "@/lib/seriesMunicipais";

export interface CamadasDoAtor { camadas: CamadaIa[]; principal: CamadaIa }
export type MapaCamadasAtores = Record<string, CamadasDoAtor>;

const PESO_CONFIANCA: Record<string, number> = { alta: 3, media: 2, baixa: 1 };
const ordem = (c: CamadaIa) => Number(c.slice(1));

interface Linha { ator_id: string; camada: string; confianca: string | null }

export async function carregarCamadasAtores(): Promise<MapaCamadasAtores> {
  const linhas = await fetchAll<Linha>(
    supabase.from("vw_ator_camada").select("ator_id,camada,confianca").like("ator_id", "rl:%").order("ator_id").order("camada"),
  );
  const acc: Record<string, Map<CamadaIa, number>> = {};
  for (const l of linhas) {
    const id = l.ator_id.slice(3);
    const c = l.camada as CamadaIa;
    const m = acc[id] ?? (acc[id] = new Map());
    m.set(c, Math.max(m.get(c) ?? 0, PESO_CONFIANCA[l.confianca ?? ""] ?? 0));
  }
  const out: MapaCamadasAtores = {};
  for (const [id, m] of Object.entries(acc)) {
    const camadas = [...m.keys()].sort((a, b) => ordem(a) - ordem(b));
    const principal = [...m.entries()].sort((a, b) => b[1] - a[1] || ordem(a[0]) - ordem(b[0]))[0][0];
    out[id] = { camadas, principal };
  }
  return out;
}

export function useCamadasAtores() {
  return useQuery({ queryKey: ["camadas-atores"], queryFn: carregarCamadasAtores, staleTime: 30 * 60_000 });
}

/**
 * Camadas de um registro do Mapa: a classificação do banco; para as unidades
 * EMBRAPII (classificadas por outro id, `embrapii_ue:`), a regra R07 ("toda
 * unidade EMBRAPII" → L6) aplicada pelo tipo.
 */
export function camadasDoRegistro(id: string, tipo: string | null | undefined, mapa: MapaCamadasAtores | undefined): CamadasDoAtor | null {
  const c = mapa?.[id];
  if (c) return c;
  if (/embrapii/i.test(tipo ?? "")) return { camadas: ["L6"], principal: "L6" };
  return null;
}
