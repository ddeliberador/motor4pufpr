import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Microscope, Building2, Factory, X, Check, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCnaeSearch } from "@/hooks/useCnaeSearch";
import type { CnaeCode } from "@/components/mvp/CnaeSelectionModal";
import type { Persona } from "@/types/persona";
import { track } from "@/lib/telemetry";

const GearIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g transform="translate(32,32)">
      <g fill="currentColor">
        <rect x="-4.5" y="-26" width="9" height="10" rx="2" transform="rotate(0)"/>
        <rect x="-4.5" y="-26" width="9" height="10" rx="2" transform="rotate(45)"/>
        <rect x="-4.5" y="-26" width="9" height="10" rx="2" transform="rotate(90)"/>
        <rect x="-4.5" y="-26" width="9" height="10" rx="2" transform="rotate(135)"/>
        <rect x="-4.5" y="-26" width="9" height="10" rx="2" transform="rotate(180)"/>
        <rect x="-4.5" y="-26" width="9" height="10" rx="2" transform="rotate(225)"/>
        <rect x="-4.5" y="-26" width="9" height="10" rx="2" transform="rotate(270)"/>
        <rect x="-4.5" y="-26" width="9" height="10" rx="2" transform="rotate(315)"/>
        <circle cx="0" cy="0" r="18" fill="currentColor"/>
      </g>
      <circle cx="0" cy="0" r="10" fill="rgba(0,0,0,0.35)"/>
      <circle cx="0" cy="-3.5" r="2" fill="white" opacity="0.8"/>
      <rect x="-1.5" y="0.5" width="3" height="7" rx="1.2" fill="white" opacity="0.8"/>
    </g>
  </svg>
);

const PERSONAS: { key: Persona; icon: React.ElementType; label: string; subtitle: string; color: string }[] = [
  { key: "pesquisador", icon: Microscope, label: "Pesquisador", subtitle: "Lacunas, financiamento, agenda científica", color: "from-violet-500 to-purple-600" },
  { key: "universidade", icon: Building2, label: "Universidade", subtitle: "Posicionamento, captação, parcerias", color: "from-blue-500 to-cyan-600" },
  { key: "empresa", icon: Factory, label: "Empresa", subtitle: "Make-or-buy, parceiro P&D, mercado", color: "from-orange-500 to-amber-600" },
  { key: "governo", icon: GearIcon, label: "Governo", subtitle: "Prioridade de investimento, efetividade", color: "from-emerald-500 to-teal-600" },
];

const EXAMPLES = ["grafeno", "baterias de lítio", "semicondutores", "hidrogênio verde", "CRISPR", "inteligência artificial"];

export default function PersonaSelector() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [cnaes, setCnaes] = useState<CnaeCode[]>([]);
  const [selectedCnaes, setSelectedCnaes] = useState<CnaeCode[]>([]);
  const [showCnaes, setShowCnaes] = useState(false);
  const [uf, setUf] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [municipios, setMunicipios] = useState<Array<{ id: number; nome: string }>>([]);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const { searchCnaes, isLoading: loadingCnaes } = useCnaeSearch();

  const UFS = [
    { sigla: "AC", nome: "Acre" }, { sigla: "AL", nome: "Alagoas" }, { sigla: "AP", nome: "Amapá" },
    { sigla: "AM", nome: "Amazonas" }, { sigla: "BA", nome: "Bahia" }, { sigla: "CE", nome: "Ceará" },
    { sigla: "DF", nome: "Distrito Federal" }, { sigla: "ES", nome: "Espírito Santo" }, { sigla: "GO", nome: "Goiás" },
    { sigla: "MA", nome: "Maranhão" }, { sigla: "MT", nome: "Mato Grosso" }, { sigla: "MS", nome: "Mato Grosso do Sul" },
    { sigla: "MG", nome: "Minas Gerais" }, { sigla: "PA", nome: "Pará" }, { sigla: "PB", nome: "Paraíba" },
    { sigla: "PR", nome: "Paraná" }, { sigla: "PE", nome: "Pernambuco" }, { sigla: "PI", nome: "Piauí" },
    { sigla: "RJ", nome: "Rio de Janeiro" }, { sigla: "RN", nome: "Rio Grande do Norte" }, { sigla: "RS", nome: "Rio Grande do Sul" },
    { sigla: "RO", nome: "Rondônia" }, { sigla: "RR", nome: "Roraima" }, { sigla: "SC", nome: "Santa Catarina" },
    { sigla: "SP", nome: "São Paulo" }, { sigla: "SE", nome: "Sergipe" }, { sigla: "TO", nome: "Tocantins" },
  ];

  // Carrega municípios quando UF muda
  useEffect(() => {
    if (!uf) { setMunicipios([]); setMunicipio(""); return; }
    setLoadingMunicipios(true);
    setMunicipio("");
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then(data => setMunicipios(data.map((m: any) => ({ id: m.id, nome: m.nome }))))
      .catch(() => setMunicipios([]))
      .finally(() => setLoadingMunicipios(false));
  }, [uf]);

  // Busca CNAEs em background ao digitar (debounced)
  useEffect(() => {
    if (query.trim().length < 3) {
      setCnaes([]);
      setSelectedCnaes([]);
      setShowCnaes(false);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchCnaes(query);
      if (results.length > 0) {
        setCnaes(results.slice(0, 6));
        setSelectedCnaes(results.filter((c) => c.isOfficialMatch).slice(0, 3));
        setShowCnaes(true);
      } else {
        setCnaes([]);
        setShowCnaes(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [query, searchCnaes]);

  const toggleCnae = useCallback((cnae: CnaeCode) => {
    setSelectedCnaes((prev) =>
      prev.some((c) => c.code === cnae.code)
        ? prev.filter((c) => c.code !== cnae.code)
        : [...prev, cnae]
    );
  }, []);

  const canSearch = query.trim().length >= 2 && selectedPersona !== null;

  const handleSearch = () => {
    if (!canSearch) return;
    sessionStorage.setItem("motor4p_query", query.trim());
    sessionStorage.setItem("motor4p_persona", selectedPersona!);
    sessionStorage.setItem("motor4p_cnaes", JSON.stringify(selectedCnaes));
    if (uf) sessionStorage.setItem("motor4p_uf", uf);
    else sessionStorage.removeItem("motor4p_uf");
    if (municipio) sessionStorage.setItem("motor4p_municipio", municipio);
    else sessionStorage.removeItem("motor4p_municipio");
    const ufObj = UFS.find(u => u.sigla === uf);
    if (ufObj) sessionStorage.setItem("motor4p_uf_nome", ufObj.nome);
    else sessionStorage.removeItem("motor4p_uf_nome");
    // Telemetria: persona e contexto estrutural, nunca o termo pesquisado.
    track("persona_selected", {
      persona: selectedPersona!,
      has_uf: Boolean(uf),
      cnae_count: selectedCnaes.length,
    });
    navigate(`/${selectedPersona}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canSearch) handleSearch();
  };

  return (
    <div className="space-y-6">
      {/* Campo de busca */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300/50 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Objeto tecnológico — ex: grafeno, baterias de lítio, CRISPR..."
          className="w-full h-14 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md pl-12 pr-4 text-base text-white placeholder:text-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/40 transition-all"
          autoFocus
        />
      </div>

      {/* Exemplos rápidos */}
      {!query && (
        <div className="flex flex-wrap gap-2 justify-center">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setQuery(ex)}
              className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-blue-300/60 hover:text-white hover:border-blue-400/40 transition-all"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Localização — opcional mas recomendada */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-blue-300/60" />
          <p className="text-xs font-semibold text-blue-300/70 uppercase tracking-wider">
            Onde você atua? <span className="text-blue-300/40 font-normal normal-case tracking-normal ml-1">— opcional · personaliza os dados para sua região</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-blue-300/50 mb-1 block">Estado</label>
            <select
              value={uf}
              onChange={e => setUf(e.target.value)}
              className="w-full h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-400/40 appearance-none cursor-pointer"
            >
              <option value="" className="bg-gray-900">Todos os estados</option>
              {UFS.map(u => (
                <option key={u.sigla} value={u.sigla} className="bg-gray-900">{u.sigla} — {u.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-blue-300/50 mb-1 block">
              Município {loadingMunicipios && <span className="text-blue-300/30">carregando...</span>}
            </label>
            <select
              value={municipio}
              onChange={e => setMunicipio(e.target.value)}
              disabled={!uf || loadingMunicipios}
              className="w-full h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-400/40 appearance-none cursor-pointer disabled:opacity-40"
            >
              <option value="" className="bg-gray-900">{uf ? "Todo o estado" : "Selecione o estado"}</option>
              {municipios.map(m => (
                <option key={m.id} value={`${m.nome}|${m.id}`} className="bg-gray-900">{m.nome}</option>
              ))}
            </select>
          </div>
        </div>
        {(uf || municipio) && (
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-blue-400/60 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {municipio ? municipio.split("|")[0] + ", " : ""}{UFS.find(u => u.sigla === uf)?.nome}
              {" — dados filtrados para sua região"}
            </p>
            <button
              onClick={() => { setUf(""); setMunicipio(""); }}
              className="text-[10px] text-blue-300/40 hover:text-white transition-colors"
            >
              limpar
            </button>
          </div>
        )}
      </div>

      {/* CNAEs sugeridos */}
      <AnimatePresence>
        {showCnaes && cnaes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 space-y-2"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-blue-300/70 uppercase tracking-wider">
                {loadingCnaes ? "Identificando setores..." : "Setores CNAE identificados — confirme os relevantes"}
              </p>
              <button onClick={() => setShowCnaes(false)} className="text-blue-300/40 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {cnaes.map((cnae) => {
                const isSelected = selectedCnaes.some((c) => c.code === cnae.code);
                return (
                  <button
                    key={cnae.code}
                    onClick={() => toggleCnae(cnae)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      isSelected
                        ? "bg-blue-500/20 border border-blue-400/40 text-white"
                        : "bg-white/5 border border-white/5 text-blue-200/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-all ${
                        isSelected ? "bg-blue-500 border-blue-400" : "border-white/20"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-[10px] text-blue-400/70 mr-2">{cnae.code}</span>
                      <span className="text-xs line-clamp-1">{cnae.description}</span>
                    </div>
                    {cnae.isOfficialMatch && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded-full flex-shrink-0">match</span>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedCnaes.length > 0 && (
              <p className="text-[10px] text-blue-300/50 pt-1">
                {selectedCnaes.length} setor{selectedCnaes.length > 1 ? "es" : ""} selecionado{selectedCnaes.length > 1 ? "s" : ""} — usados para refinar buscas em bases governamentais
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seleção de perfil — obrigatória */}
      <div>
        <p className="text-xs text-blue-300/50 text-center mb-3 uppercase tracking-wider font-semibold">
          {selectedPersona ? "Perspectiva selecionada" : "Selecione sua perspectiva para buscar"}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {PERSONAS.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedPersona === p.key;
            return (
              <motion.button
                key={p.key}
                onClick={() => setSelectedPersona(p.key)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-4 rounded-xl text-left transition-all border ${
                  isSelected
                    ? "border-white/30 bg-white/10"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="persona-selected"
                    className={`absolute inset-0 rounded-xl bg-gradient-to-br ${p.color} opacity-10`}
                  />
                )}
                <div className="relative flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold transition-colors ${isSelected ? "text-white" : "text-blue-100/80"}`}>
                      {p.label}
                    </p>
                    <p className="text-[10px] text-blue-300/50 line-clamp-1">{p.subtitle}</p>
                  </div>
                  {isSelected && (
                    <div className="ml-auto flex-shrink-0">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Botão de busca */}
      <motion.button
        onClick={handleSearch}
        disabled={!canSearch}
        whileHover={canSearch ? { scale: 1.01 } : {}}
        whileTap={canSearch ? { scale: 0.99 } : {}}
        className={`w-full h-14 rounded-xl flex items-center justify-center gap-3 text-base font-semibold transition-all ${
          canSearch
            ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            : "bg-white/5 text-blue-300/30 cursor-not-allowed border border-white/5"
        }`}
      >
        {!query.trim() ? (
          <span>Digite o objeto tecnológico</span>
        ) : !selectedPersona ? (
          <span>Selecione sua perspectiva</span>
        ) : (
          <>
            <Search className="w-5 h-5" />
            <span className="truncate">
              Analisar "{query.trim()}" como {PERSONAS.find((p) => p.key === selectedPersona)?.label}
              {uf && <span className="opacity-70"> · {municipio ? municipio.split("|")[0] : UFS.find(u => u.sigla === uf)?.nome}</span>}
            </span>
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
          </>
        )}
      </motion.button>
    </div>
  );
}
