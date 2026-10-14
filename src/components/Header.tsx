import { Link, NavLink } from "react-router-dom";

const navigation = [
  ["/", "Início"], ["/mapa", "Mapa"], ["/analise", "Análise"],
  ["/bases", "Bases"], ["/sobre", "Sobre"],
];

const Header = () => (
  <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background text-foreground">
    <div className="mx-auto flex min-h-20 max-w-[1120px] flex-wrap items-center justify-between gap-x-8 gap-y-1 px-4 py-4 sm:flex-nowrap sm:px-6">
      <Link to="/" className="font-serif text-xl font-bold leading-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
        Motor da Inovação
      </Link>
      <nav aria-label="Navegação principal" className="flex w-full items-center justify-between gap-3 sm:w-auto sm:gap-6">
        {navigation.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) =>
            `border-b-2 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${isActive ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-accent"}`
          }>{label}</NavLink>
        ))}
      </nav>
    </div>
  </header>
);

export default Header;
