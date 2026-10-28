import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Cada rota vira um pedaço separado do bundle: a página só baixa o que usa
// (o /mapa, por exemplo, é a única que carrega o MapLibre).
const PesquisadorPanel = React.lazy(() => import("./components/pesquisador/PesquisadorPanel"));
const UniversidadePanel = React.lazy(() => import("./components/universidade/UniversidadePanel"));
const EmpresaPanel = React.lazy(() => import("./components/empresa/EmpresaPanel"));
const GovernoPanel = React.lazy(() => import("./components/governo/GovernoPanel"));
const Index = React.lazy(() => import("./pages/Index"));
const Conceito = React.lazy(() => import("./pages/Conceito"));
const Analise = React.lazy(() => import("./pages/Analise"));
const Mapa = React.lazy(() => import("./pages/Mapa"));
const Documentacao = React.lazy(() => import("./pages/Documentacao"));
const Bases = React.lazy(() => import("./pages/Bases"));
const Faq = React.lazy(() => import("./pages/Faq"));
const GestaoPesquisa = React.lazy(() => import("./pages/GestaoPesquisa"));
const AuthPage = React.lazy(() => import("./pages/Auth"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Sobre = React.lazy(() => import("./pages/Sobre"));

const Carregando = () => (
  <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Carregando…</div>
);

const queryClient = new QueryClient();

// O /mapa é o pedaço mais pesado (MapLibre). Quem entra por outra página já baixa esse
// pedaço em segundo plano, quando o navegador está ocioso, para o primeiro acesso ao mapa
// não esperar o download.
if (typeof window !== "undefined") {
  const prefetch = () => { import("./pages/Mapa").catch(() => undefined); };
  if ("requestIdleCallback" in window) (window as Window & { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback(prefetch, { timeout: 4000 });
  else setTimeout(prefetch, 2500);
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <React.Suspense fallback={<Carregando />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/conceito" element={<Conceito />} />
          <Route path="/mapa" element={<Mapa />} />
          <Route path="/documentacao" element={<Documentacao />} />
          <Route path="/bases" element={<Bases />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/analise" element={<Analise />} />
          <Route path="/pesquisador" element={<PesquisadorPanel />} />
          <Route path="/universidade" element={<UniversidadePanel />} />
          <Route path="/empresa" element={<EmpresaPanel />} />
          <Route path="/governo" element={<GovernoPanel />} />
          
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/gestao-pesquisa" element={<GestaoPesquisa />} />
          <Route path="/camada-ausente" element={<Navigate to="/conceito" replace />} />
          <Route path="/mvp" element={<Navigate to="/pesquisador" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </React.Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
