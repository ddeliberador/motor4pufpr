import { Link, useLocation } from "react-router-dom";

const Header = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container-wide">
        <nav className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg font-serif">4P</span>
            </div>
            <span className="font-serif font-semibold text-lg text-foreground hidden sm:block">
              MOTOR 4P UFPR
            </span>
          </Link>

          <div className="flex items-center gap-6 md:gap-8">
            <Link
              to="/"
              className={`nav-link ${isActive("/") ? "active" : ""}`}
            >
              Conceito
            </Link>
            <Link
              to="/mvp"
              className={`nav-link ${isActive("/mvp") ? "active" : ""}`}
            >
              MVP Engine
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
