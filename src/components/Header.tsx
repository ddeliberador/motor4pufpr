import { Link, useLocation } from "react-router-dom";
import { Menu, X, Zap } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
              <span className="font-semibold text-lg text-foreground tracking-tight">
                MOTOR 4P
              </span>
              <span className="text-xs text-muted-foreground block -mt-0.5">UFPR</span>
            </div>
          </Link>



          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/"
              className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
            >
              <Zap className="w-4 h-4" />
              Escolher Perfil
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
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-primary flex items-center justify-center gap-2 mt-2"
              >
                <Zap className="w-4 h-4" />
                Escolher Perfil
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
