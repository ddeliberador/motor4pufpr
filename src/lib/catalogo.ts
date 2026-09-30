import { useEffect, useState } from "react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import type { Tables } from "@/integrations/supabase/types";

/** Catálogo único de bases (tabela catalogo_bases): fonte da verdade para Bases, Mapa, Motor e construtor. */
export type CatalogoBase = Tables<"catalogo_bases">;

let cache: Promise<CatalogoBase[]> | null = null;

export function carregarCatalogo(forcar = false): Promise<CatalogoBase[]> {
  if (forcar) cache = null;
  cache ??= (async () => {
    const { data, error } = await supabase.from("catalogo_bases").select("*").order("ordem").order("nome");
    if (error) throw new Error(`Catálogo de bases: ${error.message}`);
    return (data ?? []) as CatalogoBase[];
  })().catch((e) => {
    cache = null;
    throw e;
  });
  return cache;
}

export function useCatalogo() {
  const [bases, setBases] = useState<CatalogoBase[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    let ativo = true;
    carregarCatalogo(versao > 0)
      .then((b) => ativo && (setBases(b), setErro(null)))
      .catch((e) => ativo && setErro(e instanceof Error ? e.message : String(e)));
    return () => { ativo = false; };
  }, [versao]);
  return { bases, erro, recarregar: () => setVersao((v) => v + 1) };
}

export type Detalhes = {
  motor?: { fonte: string; camada: string };
  mapa_territorial?: { nome: string; responsavel: string; url: string; registros: string; vinculo: string; origem: string; limitacoes: string };
  mapa_complementar?: { nome: string; responsavel: string; pilar: string; medicao: string; situacao: string; url: string };
  catalogo_fontes?: { fonte: string; dados_chave?: string; status_pesquisa?: string; endpoint_url?: string; ordem?: number };
  bi?: { key: string; cruzado?: boolean };
};

export const detalhesDe = (b: CatalogoBase) => (b.detalhes ?? {}) as Detalhes;

/** Uma camada/base do Mapa está desligada no catálogo? (chave do construtor, ex.: "l1_usinas") */
export const inativaNoCatalogo = (bases: CatalogoBase[] | null, biKey: string) =>
  !!bases?.find((b) => detalhesDe(b).bi?.key === biKey && !b.ativa);
