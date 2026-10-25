// Navegação inferior do Motor em telas estreitas (até 767px): quatro destinos
// fixos no rodapé, no lugar da barra de links do cabeçalho, que some nesse
// tamanho. "Perfis" e "Mais" abrem gavetas com os demais caminhos, para não
// haver página sem acesso no celular. Em tela larga nada disto aparece.

import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { GavetaInferior } from "@/components/GavetaInferior";

const PRINCIPAIS = [
  { to: "/mapa", rotulo: "Mapa", icone: "map" },
  { to: "/analise", rotulo: "Análise", icone: "analytics" },
] as const;
const PERFIS = [
  { to: "/pesquisador", rotulo: "Pesquisador", icone: "person_search", desc: "Produção, redes e oportunidades de quem pesquisa" },
  { to: "/universidade", rotulo: "Universidade", icone: "school", desc: "Transferência de tecnologia e cooperação" },
  { to: "/empresa", rotulo: "Empresa", icone: "factory", desc: "Parceiros, fomento e mural de oportunidades" },
  { to: "/governo", rotulo: "Governo", icone: "account_balance", desc: "Índices estratégicos e coordenação" },
] as const;
const MAIS = [
  { to: "/", rotulo: "Início", icone: "home" },
  { to: "/conceito", rotulo: "Conceito", icone: "lightbulb" },
  { to: "/bases", rotulo: "Bases de dados", icone: "database" },
  { to: "/documentacao", rotulo: "Documentação", icone: "menu_book" },
  { to: "/faq", rotulo: "Perguntas frequentes", icone: "help" },
  { to: "/sobre", rotulo: "Sobre", icone: "info" },
  { to: "/gestao-pesquisa", rotulo: "Gestão da pesquisa", icone: "admin_panel_settings" },
] as const;

const PERFIS_ROTAS = new Set<string>(PERFIS.map((p) => p.to));

export default function NavInferior() {
  const [aberta, setAberta] = useState<"perfis" | "mais" | null>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const emPerfil = PERFIS_ROTAS.has(pathname);
  const emMais = !emPerfil && !PRINCIPAIS.some((p) => pathname.startsWith(p.to));

  const base = "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] leading-none transition-colors";
  const cor = (ativo: boolean) => (ativo ? "text-foreground" : "text-muted-foreground");
  const Icone = ({ nome, ativo }: { nome: string; ativo: boolean }) => (
    <span className="material-symbols-outlined text-[24px] leading-none" style={ativo ? { fontVariationSettings: '"FILL" 1' } : undefined} aria-hidden>{nome}</span>
  );

  return (
    <>
      <nav
        data-nav-inferior
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-background/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {PRINCIPAIS.map((p) => (
          <NavLink key={p.to} to={p.to} className={({ isActive }) => `${base} ${cor(isActive)}`}>
            {({ isActive }) => (<><Icone nome={p.icone} ativo={isActive} />{p.rotulo}</>)}
          </NavLink>
        ))}
        <button type="button" onClick={() => setAberta("perfis")} aria-haspopup="dialog" aria-expanded={aberta === "perfis"} className={`${base} ${cor(emPerfil)}`}>
          <Icone nome="group" ativo={emPerfil} />Perfis
        </button>
        <button type="button" onClick={() => setAberta("mais")} aria-haspopup="dialog" aria-expanded={aberta === "mais"} className={`${base} ${cor(emMais)}`}>
          <Icone nome="more_horiz" ativo={emMais} />Mais
        </button>
      </nav>

      <GavetaInferior aberta={aberta === "perfis"} onAberta={(v) => setAberta(v ? "perfis" : null)} titulo="Perfis" descricao="O Motor visto por quem o usa">
        <ul className="divide-y divide-border">
          {PERFIS.map((p) => (
            <li key={p.to}>
              <button type="button" onClick={() => { setAberta(null); navigate(p.to); }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left ${pathname === p.to ? "bg-muted/60" : "hover:bg-muted/40"}`}>
                <span className="material-symbols-outlined text-2xl leading-none text-accent" aria-hidden>{p.icone}</span>
                <span className="min-w-0"><span className="block text-sm font-semibold">{p.rotulo}</span><span className="block text-xs text-muted-foreground">{p.desc}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </GavetaInferior>

      <GavetaInferior aberta={aberta === "mais"} onAberta={(v) => setAberta(v ? "mais" : null)} titulo="Mais">
        <ul className="grid grid-cols-2 gap-1 px-3 pb-3">
          {MAIS.map((m) => (
            <li key={m.to}>
              <button type="button" onClick={() => { setAberta(null); navigate(m.to); }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm ${pathname === m.to ? "bg-muted/60 font-semibold" : "hover:bg-muted/40"}`}>
                <span className="material-symbols-outlined text-xl leading-none text-muted-foreground" aria-hidden>{m.icone}</span>{m.rotulo}
              </button>
            </li>
          ))}
        </ul>
      </GavetaInferior>
    </>
  );
}
