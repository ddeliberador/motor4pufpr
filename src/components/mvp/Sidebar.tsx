import React from "react";
import { Search, Activity, ChevronRight, Zap, Database, Building2, X } from "lucide-react";
import ApiStatusIndicator from "@/components/ApiStatusIndicator";
import ApiStatusView from "@/components/ApiStatusView";
import IndicatorsCard from "./IndicatorsCard";
import StrategicQuestion from "./StrategicQuestion";
import { Link } from "react-router-dom";
import type { CnaeCode } from "./CnaeSelectionModal";
import type { Persona } from "@/types/persona";
import { personaConfigs } from "@/config/personas";

interface SidebarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: (e: React.FormEvent) => void;
  isSearching: boolean;
  showApiStatus: boolean;
  setShowApiStatus: (show: boolean) => void;
  indicators?: {
    c2t: { value: number; label: string; description: string };
    gt: { value: number; label: string; description: string };
    p2c: { value: number; label: string; description: string };
    cd: { value: number; label: string; description: string };
  };
  selectedCnaes?: CnaeCode[];
  onRemoveCnae?: (code: string) => void;
  persona?: Persona;
}

const Sidebar = ({
  searchQuery,
  setSearchQuery,
  onSearch,
  isSearching,
  showApiStatus,
  setShowApiStatus,
  indicators,
  selectedCnaes = [],
  onRemoveCnae,
  persona,
}: SidebarProps) => {
  const config = persona ? personaConfigs[persona] : undefined;

  return (
    <aside className="w-full md:w-80 flex-shrink-0 bg-card border-r border-border shadow-lg overflow-y-auto md:sticky md:top-16 h-auto md:h-[calc(100vh-4rem)]">
      <div className="p-5 md:p-6 space-y-6">
        {/* Logo and Title */}
        <div className="text-center pb-6 border-b border-border">
          <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${config ? config.color : 'from-primary to-primary/80'} flex items-center justify-center shadow-lg shadow-primary/20`}>
            {config ? <config.icon className="w-7 h-7 text-white" /> : <Zap className="w-7 h-7 text-primary-foreground" />}
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-1">
            {config ? `Motor 4P — ${config.label}` : 'MVP Engine'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {config ? config.subtitle : 'Primeira Camada da Tradução'}
          </p>
        </div>

        {/* Strategic Question */}
        {config && <StrategicQuestion config={config} />}

        {/* Back Link */}
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
          Voltar para Seleção
        </Link>

        {/* Search Box */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              Buscar Objeto Tecnológico
            </label>
            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20">
              Dados Reais
            </span>
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

        {/* Selected CNAEs Display */}
        {selectedCnaes.length > 0 && (
          <div className="space-y-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  CNAEs Vinculados
                </span>
              </div>
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                {selectedCnaes.length}
              </span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedCnaes.map(cnae => (
                <div
                  key={cnae.code}
                  className="flex items-start gap-2 p-2 bg-background rounded-lg border border-border group"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs font-semibold text-primary block">
                      {cnae.code}
                    </span>
                    <span className="text-[10px] text-muted-foreground line-clamp-2">
                      {cnae.description}
                    </span>
                  </div>
                  {onRemoveCnae && (
                    <button
                      onClick={() => onRemoveCnae(cnae.code)}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Remover CNAE"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Status Section */}
        <div className="space-y-3">
          <button
            onClick={() => setShowApiStatus(!showApiStatus)}
            className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-muted/80 rounded-xl text-sm font-medium transition-all duration-200"
          >
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Status das APIs (CNPq, INPI, OpenAlex, COMEX, Finep)
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
