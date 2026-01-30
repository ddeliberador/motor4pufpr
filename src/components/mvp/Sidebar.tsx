import React from "react";
import { Search, Activity, ChevronRight, Zap, Database } from "lucide-react";
import UfprLogo from "@/components/UfprLogo";
import ApiStatusIndicator from "@/components/ApiStatusIndicator";
import ApiStatusView from "@/components/ApiStatusView";
import IndicatorsCard from "./IndicatorsCard";
import { Link } from "react-router-dom";

interface SidebarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: (e: React.FormEvent) => void;
  isSearching: boolean;
  isUsingMock: boolean;
  backendAvailable: boolean;
  showApiStatus: boolean;
  setShowApiStatus: (show: boolean) => void;
  indicators?: {
    c2t: { value: number; label: string; description: string };
    gt: { value: number; label: string; description: string };
    p2c: { value: number; label: string; description: string };
    cd: { value: number; label: string; description: string };
  };
}

const Sidebar = ({
  searchQuery,
  setSearchQuery,
  onSearch,
  isSearching,
  isUsingMock,
  backendAvailable,
  showApiStatus,
  setShowApiStatus,
  indicators,
}: SidebarProps) => {
  return (
    <aside className="w-full md:w-80 flex-shrink-0 bg-card border-r border-border shadow-lg overflow-y-auto md:sticky md:top-16 h-auto md:h-[calc(100vh-4rem)]">
      <div className="p-5 md:p-6 space-y-6">
        {/* Logo and Title */}
        <div className="text-center pb-6 border-b border-border">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
            <Zap className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-1">
            MVP Engine
          </h1>
          <p className="text-xs text-muted-foreground">
            Primeira Camada da Tradução
          </p>
        </div>

        {/* Back Link */}
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
          Voltar para Conceito
        </Link>

        {/* Search Box */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              Buscar Objeto Tecnológico
            </label>
            <ApiStatusIndicator 
              isUsingMock={isUsingMock}
              backendAvailable={backendAvailable}
            />
          </div>
          
          <form onSubmit={onSearch} className="space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex: baterias de lítio, grafeno..."
                className="input-modern pl-11"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Buscar
                </>
              )}
            </button>
          </form>
        </div>

        {/* API Status Section */}
        <div className="space-y-3">
          <button
            onClick={() => setShowApiStatus(!showApiStatus)}
            className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-muted/80 rounded-xl text-sm font-medium transition-all duration-200"
          >
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Status das APIs
            </span>
            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${showApiStatus ? 'rotate-90' : ''}`} />
          </button>

          {showApiStatus && (
            <div className="bg-muted/50 border border-border rounded-xl p-4 max-h-80 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
              <ApiStatusView />
            </div>
          )}
        </div>

        {/* Indicators */}
        {indicators && (
          <div className="pt-6 border-t border-border">
            <IndicatorsCard {...indicators} />
          </div>
        )}

        {/* Info */}
        <div className="pt-6 border-t border-border">
          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-xs font-medium text-foreground mb-2">
              📊 Protótipo Auditável
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Baseado em dados públicos reais: CNPq, INPI, Finep, OpenAlex, COMEX Stat, CAPES e outras fontes.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
