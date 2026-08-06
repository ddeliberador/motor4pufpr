import { Link, useLocation } from "react-router-dom";
import { Menu, X, Lock } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const Header = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;



  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card">
      <div className="container-wide">
        <nav className="flex items-center justify-between gap-3 h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0">
            {/* Engrenagem SVG inline */}
            <svg className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="64" height="64" rx="14" fill="#07101c"/>
              <g transform="translate(32,32)">
                <g fill="#3b82f6">
                  <rect x="-4.5" y="-26" width="9" height="10" rx="2" transform="rotate(0)"/>
                  <rect x="-4.5" y="-26" width="9" height="10" rx="2" transform="rotate(45)"/>
                  <rect x="-4.5" y="-26" width="9" height="10" rx="2" transform="rotate(90)"/>
                  <rect x="-4.5" y="-26" width="9" height="10" rx="2" transform="rotate(135)"/>
                  <rect x="-4.5" y="-26" width="9" height="10" rx="2" transform="rotate(180)"/>
                  <rect x="-4.5" y="-26" width="9" height="10" rx="2" transform="rotate(225)"/>
                  <rect x="-4.5" y="-26" width="9" height="10" rx="2" transform="rotate(270)"/>
                  <rect x="-4.5" y="-26" width="9" height="10" rx="2" transform="rotate(315)"/>
                  <circle cx="0" cy="0" r="18" fill="#3b82f6"/>
                </g>
                <circle cx="0" cy="0" r="10" fill="#07101c"/>
                <circle cx="0" cy="-3.5" r="2" fill="#3b82f6"/>
                <rect x="-1.5" y="0.5" width="3" height="7" rx="1.2" fill="#3b82f6"/>
              </g>
            </svg>
            <div className="min-w-0">
              <span className="font-semibold text-sm sm:text-base text-foreground tracking-tight whitespace-nowrap">
                Motor da <span className="text-primary">Inovação</span>
              </span>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground block -mt-0.5 tracking-widest uppercase whitespace-nowrap">UFPR · PPGPP</span>
            </div>
          </Link>



          {/* Nav Links + CTA */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6 flex-shrink-0">
            <Link
              to="/conceito"
              className={`text-sm font-medium transition-colors ${isActive('/conceito') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Conceito
            </Link>
            <Link
              to="/documentacao"
              className={`text-sm font-medium transition-colors ${isActive('/documentacao') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Documentação
            </Link>
            <Link
              to={user ? "/gestao-pesquisa" : "/auth"}
              title="Gestão da Pesquisa"
              className={`p-2 rounded-lg transition-colors ${isActive('/gestao-pesquisa') ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
            >
              <Lock className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-foreground" />
            ) : (
              <Menu className="w-5 h-5 text-foreground" />
            )}
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-2">
              <Link
                to="/conceito"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/conceito') ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              >
                Conceito
              </Link>
              <Link
                to="/documentacao"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/documentacao') ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              >
                Documentação
              </Link>
              <Link
                to={user ? "/gestao-pesquisa" : "/auth"}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${isActive('/gestao-pesquisa') ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              >
                <Lock className="w-3.5 h-3.5" />
                Área restrita
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
