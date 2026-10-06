// A API do banco devolve no máximo 1.000 linhas por chamada.
// Pagina a mesma consulta até esgotar, para contagens nunca pararem em 1.000.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAll<T>(q: any, pagina = 1000): Promise<T[]> {
  const todas: T[] = [];
  for (let de = 0; ; de += pagina) {
    const { data, error } = await q.range(de, de + pagina - 1);
    if (error) throw error;
    todas.push(...((data || []) as T[]));
    if (!data || data.length < pagina) return todas;
  }
}
