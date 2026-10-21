// Harness visual do MapaBrasil com dados sintéticos (sem Supabase): `npm run demo:mapa`.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
const root = path.resolve(__dirname, "..");
export default defineConfig({
  root: path.join(root, "demo-mapa"),
  publicDir: path.join(root, "public"),
  envDir: root,
  base: "./",
  css: { postcss: root },
  plugins: [react()],
  resolve: { alias: { "@": path.join(root, "src") } },
  build: { outDir: path.join(root, "demo-mapa", "dist"), emptyOutDir: true, copyPublicDir: false, rollupOptions: { output: { inlineDynamicImports: true } } },
});
