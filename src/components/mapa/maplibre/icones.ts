// Ícones Material Symbols rasterizados para o MapLibre.
// O MapLibre desenha símbolos a partir de imagens registradas no mapa; a fonte
// Material Symbols já está carregada no documento, então cada glifo é pintado
// uma única vez num canvas (por nome + cor) e registrado com map.addImage.

import type { Map as MapLibre, ExpressionSpecification } from "maplibre-gl";

const PX = 48; // resolução base (desenhado em 2x e exibido com icon-size)
const cacheCor = new Map<string, string>();

/** Resolve uma classe Tailwind de cor (ex.: "text-sky-500") para a cor computada. */
export function corDaClasse(classe: string): string {
  const hit = cacheCor.get(classe);
  if (hit) return hit;
  if (typeof document === "undefined") return "#888";
  const el = document.createElement("span");
  el.className = classe;
  el.style.position = "absolute";
  el.style.visibility = "hidden";
  document.body.appendChild(el);
  const cor = getComputedStyle(el).color || "#888";
  el.remove();
  cacheCor.set(classe, cor);
  return cor;
}

/** Cor de um token do tema (ex.: "--background") como string hsl(). */
export function corDoTema(token: string, alpha?: number): string {
  if (typeof document === "undefined") return "#000";
  const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  if (!v) return "#000";
  // Os tokens do tema são "H S% L%" (sintaxe moderna do CSS). O MapLibre só
  // entende a forma com vírgulas, então a cor é remontada como hsla(H, S%, L%, A).
  const [h, s, l] = v.split(/\s+/);
  return `hsla(${h}, ${s}, ${l}, ${alpha ?? 1})`;
}

/**
 * Converte uma cor CSS que usa token do tema, como "hsl(var(--primary) / 0.4)",
 * para uma cor que o MapLibre entende. Cores já concretas passam intactas.
 */
export function resolverCorCss(cor: string): string {
  const m = /^hsl\(\s*var\((--[\w-]+)\)\s*(?:\/\s*([\d.]+)\s*)?\)$/.exec(cor.trim());
  if (!m) return cor;
  return corDoTema(m[1], m[2] != null ? Number(m[2]) : undefined);
}

export function idIcone(glifo: string, cor: string, preenchido = true) {
  return `ms|${glifo}|${cor}|${preenchido ? 1 : 0}`;
}

/**
 * Garante que o ícone exista no mapa. Devolve o id da imagem.
 * Segunda chamada com os mesmos parâmetros é gratuita.
 */
export function garantirIcone(map: MapLibre, glifo: string, cor: string, preenchido = true): string {
  const id = idIcone(glifo, cor, preenchido);
  if (map.hasImage(id)) return id;
  const canvas = document.createElement("canvas");
  canvas.width = PX;
  canvas.height = PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) return id;
  ctx.font = `${PX * 0.82}px "Material Symbols Outlined"`;
  // Eixos variáveis da fonte: preenchimento e peso.
  (ctx as CanvasRenderingContext2D & { fontVariationSettings?: string }).fontVariationSettings =
    `"FILL" ${preenchido ? 1 : 0}, "wght" 500, "GRAD" 0, "opsz" 48`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = cor;
  ctx.fillText(glifo, PX / 2, PX / 2 + PX * 0.02);
  const data = ctx.getImageData(0, 0, PX, PX);
  map.addImage(id, data, { pixelRatio: 2 });
  return id;
}

/** Espera a fonte Material Symbols estar disponível para rasterização. */
export async function aguardarFonteMaterial(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await document.fonts.load(`24px "Material Symbols Outlined"`);
  } catch {
    /* sem a fonte o ícone sai como texto; o mapa segue funcionando */
  }
}

const BADGE_PX = 40;
/**
 * Contador de cluster como imagem (círculo com número), para não depender do
 * servidor de glifos: um símbolo com text-field só aparece quando a fonte
 * remota chega, e sem rede o cluster inteiro sumiria.
 */
export function garantirBadge(map: MapLibre, texto: string, fundo: string, borda: string, cor: string): string {
  const id = `badge|${texto}|${fundo}|${cor}`;
  if (map.hasImage(id)) return id;
  const canvas = document.createElement("canvas");
  canvas.width = BADGE_PX;
  canvas.height = BADGE_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) return id;
  const r = BADGE_PX / 2 - 2;
  ctx.beginPath();
  ctx.arc(BADGE_PX / 2, BADGE_PX / 2, r, 0, Math.PI * 2);
  ctx.fillStyle = fundo;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = borda;
  ctx.stroke();
  ctx.font = `600 ${texto.length > 2 ? 15 : 18}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = cor;
  ctx.fillText(texto, BADGE_PX / 2, BADGE_PX / 2 + 1);
  map.addImage(id, ctx.getImageData(0, 0, BADGE_PX, BADGE_PX), { pixelRatio: 2 });
  return id;
}

/** Gera os badges de 2 a 99 e "99+" e devolve a expressão que escolhe o id pelo point_count. */
export function badgesDeCluster(map: MapLibre, fundo: string, borda: string, cor: string): ExpressionSpecification {
  for (let n = 2; n <= 99; n++) garantirBadge(map, String(n), fundo, borda, cor);
  const mais = garantirBadge(map, "99+", fundo, borda, cor);
  return ["case", [">", ["get", "point_count"], 99], mais, ["concat", `badge|`, ["to-string", ["get", "point_count"]], `|${fundo}|${cor}`]];
}

/**
 * Rótulo de texto (uma ou duas linhas, com contorno) como imagem. Usado nos
 * rótulos regionais e no destaque de usina, pelo mesmo motivo dos badges:
 * sem depender do servidor remoto de glifos.
 */
export function garantirRotulo(map: MapLibre, linhas: string[], cor: string, halo: string, tamanho = 15, negrito = true): string {
  const id = `rotulo|${linhas.join("\n")}|${cor}|${halo}|${tamanho}|${negrito ? 1 : 0}`;
  if (map.hasImage(id)) return id;
  const esc = 2;
  const fonte = (i: number) => `${negrito && i === 0 ? 700 : 500} ${(i === 0 ? tamanho : tamanho * 0.85) * esc}px system-ui, sans-serif`;
  const medida = document.createElement("canvas").getContext("2d");
  if (!medida) return id;
  let largura = 0;
  linhas.forEach((l, i) => { medida.font = fonte(i); largura = Math.max(largura, medida.measureText(l).width); });
  const alturaLinha = tamanho * esc * 1.25;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(largura + 12 * esc);
  canvas.height = Math.ceil(alturaLinha * linhas.length + 6 * esc);
  const ctx = canvas.getContext("2d");
  if (!ctx) return id;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  linhas.forEach((l, i) => {
    ctx.font = fonte(i);
    const y = 3 * esc + alturaLinha * (i + 0.5);
    ctx.lineWidth = tamanho * esc * 0.28;
    ctx.strokeStyle = halo;
    ctx.strokeText(l, canvas.width / 2, y);
    ctx.fillStyle = cor;
    ctx.fillText(l, canvas.width / 2, y);
  });
  map.addImage(id, ctx.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: esc });
  return id;
}
