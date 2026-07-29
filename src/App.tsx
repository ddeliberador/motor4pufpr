import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import PesquisadorPanel from "./components/pesquisador/PesquisadorPanel";
import UniversidadePanel from "./components/universidade/UniversidadePanel";
import EmpresaPanel from "./components/empresa/EmpresaPanel";
import Index from "./pages/Index";
import Conceito from "./pages/Conceito";
import Documentacao from "./pages/Documentacao";
import GestaoPesquisa from "./pages/GestaoPesquisa";
import AuthPage from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/conceito" element={<Conceito />} />
          <Route path="/documentacao" element={<Documentacao />} />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
