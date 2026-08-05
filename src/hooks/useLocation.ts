// Lê e expõe a localização salva no sessionStorage pelo PersonaSelector
export function useMotorLocation() {
  const uf = sessionStorage.getItem("motor4p_uf") || "";
  const ufNome = sessionStorage.getItem("motor4p_uf_nome") || "";
  const municipioRaw = sessionStorage.getItem("motor4p_municipio") || "";
  const municipioNome = municipioRaw ? municipioRaw.split("|")[0] : "";
  const municipioIbge = municipioRaw ? municipioRaw.split("|")[1] : "";

  const label = municipioNome
    ? `${municipioNome} · ${uf}`
    : ufNome
    ? ufNome
    : "";

  const hasLocation = !!uf;

  return { uf, ufNome, municipioNome, municipioIbge, label, hasLocation };
}
