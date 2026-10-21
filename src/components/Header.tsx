import { Link, NavLink } from "react-router-dom";

const navigation = [
  ["/", "Início"], ["/mapa", "Mapa"], ["/analise", "Análise"],
  ["/bases", "Bases"], ["/sobre", "Sobre"],
];

const Header = () => (
  <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background text-foreground">
    {/* Barra de altura fixa (4rem) e largura total: a marca alinha à esquerda com o
        conteúdo de qualquer página, inclusive as de largura total como o /mapa. */}
    <div className="flex h-16 items-center justify-between gap-6 px-4 sm:px-6">
      <Link to="/" className="flex shrink-0 items-center gap-2.5 font-serif text-lg font-bold leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:text-xl">
        <span className="material-symbols-outlined text-[22px] leading-none text-accent" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden>hub</span>
        Motor da Inovação
      </Link>
      <nav aria-label="Navegação principal" className="flex h-full items-center gap-4 overflow-x-auto sm:gap-6">
        {navigation.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) =>
            `flex h-full items-center border-b-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${isActive ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`
          }>{label}</NavLink>
        ))}
      </nav>
    </div>
  </header>
);

export default Header;
