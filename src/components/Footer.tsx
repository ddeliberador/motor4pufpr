import { Link } from "react-router-dom";
import { Zap, Github, Mail, ExternalLink } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const links = {
    projeto: [
      { label: "Conceito", href: "/" },
      { label: "MVP Engine", href: "/mvp" },
      { label: "Documentação", href: "#" },
    ],
    recursos: [
      { label: "CNPq", href: "https://lattes.cnpq.br/", external: true },
      { label: "INPI", href: "https://www.gov.br/inpi/", external: true },
      { label: "OpenAlex", href: "https://openalex.org/", external: true },
      { label: "COMEX Stat", href: "https://comexstat.mdic.gov.br/", external: true },
    ],
    contato: [
      { label: "GitHub", href: "https://github.com/ddeliberador/motor4pufpr", external: true, icon: Github },
      { label: "Contato", href: "mailto:contato@motor4p.ufpr.br", external: true, icon: Mail },
    ],
  };

  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Main Footer */}
      <div className="container-wide py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-semibold text-lg tracking-tight">MOTOR 4P</span>
                <span className="text-xs text-primary-foreground/70 block -mt-0.5">UFPR</span>
              </div>
            </div>
            <p className="text-sm text-primary-foreground/70 leading-relaxed mb-4">
              A Camada Ausente da Política Industrial Brasileira. 
              Infraestrutura computacional para conectar Pesquisa, Produção, Política e Patentes.
            </p>
            <p className="text-xs text-primary-foreground/50">
              Doutorado em Políticas Públicas — UFPR
            </p>
          </div>

          {/* Links - Projeto */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-primary-foreground/90">
              Projeto
            </h4>
            <ul className="space-y-2">
              {links.projeto.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links - Recursos */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-primary-foreground/90">
              Fontes de Dados
            </h4>
            <ul className="space-y-2">
              {links.recursos.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors inline-flex items-center gap-1"
                  >
                    {link.label}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Links - Contato */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-primary-foreground/90">
              Contato
            </h4>
            <ul className="space-y-3">
              {links.contato.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors inline-flex items-center gap-2"
                  >
                    {link.icon && <link.icon className="w-4 h-4" />}
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-primary-foreground/10">
        <div className="container-wide py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-primary-foreground/50">
            <p>© {currentYear} MOTOR 4P UFPR. Todos os direitos reservados.</p>
            <div className="flex items-center gap-4">
              <span>Dados Públicos</span>
              <span>•</span>
              <span>Open Source</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
