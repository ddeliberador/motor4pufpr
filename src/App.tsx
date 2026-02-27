import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CamadaAusente from "./pages/CamadaAusente";
import PersonaDashboard from "./pages/PersonaDashboard";
import GovernoPanel from "./components/governo/GovernoPanel";
import Index from "./pages/Index";
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
          <Route path="/pesquisador" element={<PersonaDashboard persona="pesquisador" />} />
          <Route path="/universidade" element={<PersonaDashboard persona="universidade" />} />
          <Route path="/empresa" element={<PersonaDashboard persona="empresa" />} />
          <Route path="/governo" element={<GovernoPanel />} />
          <Route path="/camada-ausente" element={<CamadaAusente />} />
          <Route path="/mvp" element={<Navigate to="/pesquisador" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
