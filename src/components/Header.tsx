import { Link, useLocation } from "react-router-dom";
import { Menu, X, Zap, Lock } from "lucide-react";
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
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <span className="font-semibold text-lg text-foreground tracking-tight uppercase">
                MOTOR DA INOVAÇÃO
              </span>
              <span className="text-xs text-muted-foreground block -mt-0.5">UFPR</span>
            </div>
          </Link>



          {/* Nav Links + CTA */}
          <div className="hidden md:flex items-center gap-6">
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
              className={`text-sm font-medium transition-colors flex items-center gap-1 ${isActive('/gestao-pesquisa') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Lock className="w-3 h-3" />
              Gestão da Pesquisa
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${isActive('/gestao-pesquisa') ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              >
                <Lock className="w-3 h-3" />
                Gestão da Pesquisa
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
