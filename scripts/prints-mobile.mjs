// Prints e checagem de largura do Motor em telas estreitas e largas.
// Uso: com o app servido (npm run dev), `node scripts/prints-mobile.mjs [url] [pasta]`.
// Para cada rota, tira um print a 390px e a 1280px e falha se a página rolar na horizontal.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:5173";
const pasta = process.argv[3] ?? "prints";
mkdirSync(pasta, { recursive: true });
const rotas = (process.env.ROTAS ?? "/,/mapa,/mapa#parana,/analise,/analise?cenario=6,/bases,/documentacao,/sobre,/pesquisador,/empresa").split(",");
// Sem rede para o Supabase (ambiente de desenvolvimento), STUB=1 responde vazio às leituras para as páginas montarem.
const stub = process.env.STUB === "1";
const larguras = [[390, 844], [1280, 800]];
const exe = process.env.CHROMIUM_PATH;
const b = await chromium.launch(exe ? { executablePath: exe, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } : {});
let falhas = 0;
for (const [w, h] of larguras) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1, isMobile: w < 500, hasTouch: w < 500 });
  for (const rota of rotas) {
    const p = await ctx.newPage();
    if (stub) {
      await p.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
      await p.route("**/functions/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
      await p.route("**/auth/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    }
    await p.goto(base + rota, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(6000);
    const nome = `${pasta}/${w}-${rota.replace(/[/?=]+/g, "_").replace(/^_|_$/g, "") || "home"}.png`;
    await p.screenshot({ path: nome });
    const { sw, iw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    const ok = sw <= iw + 1;
    if (!ok) falhas++;
    console.log(`${ok ? "ok " : "LARGA"} ${w}px ${rota} (${sw}/${iw}) → ${nome}`);
    await p.close();
  }
  await ctx.close();
}
await b.close();
process.exit(falhas ? 1 : 0);
