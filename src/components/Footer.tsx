import { Link } from "react-router-dom";
import { Github, Mail, ExternalLink } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const links = {
    projeto: [
      { label: "Conceito", href: "/conceito" },
      { label: "Documentação", href: "/documentacao" },
    ],
    recursos: [
      { label: "CNPq", href: "https://lattes.cnpq.br/", external: true },
      { label: "INPI", href: "https://www.gov.br/inpi/", external: true },
      { label: "OpenAlex", href: "https://openalex.org/", external: true },
      { label: "COMEX Stat", href: "https://comexstat.mdic.gov.br/", external: true },
      { label: "Finep", href: "https://www.finep.gov.br/", external: true },
      { label: "BNDES", href: "https://www.bndes.gov.br/", external: true },
      { label: "Embrapii", href: "https://embrapii.org.br/", external: true },
    ],
    contato: [
      { label: "GitHub", href: "https://github.com/ddeliberador/motor4pufpr", external: true, icon: Github },
      { label: "Contato", href: "mailto:contato@motor4p.ufpr.br", external: true, icon: Mail },
    ],
  };

  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Main Footer */}
      <div className="container-wide py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              {/* Logo oficial — engrenagem com "i" centralizado */}
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <rect width="44" height="44" rx="10" fill="white" fillOpacity="0.08"/>
                {/* Engrenagem */}
                <path
                  d="M22 14.5a1.5 1.5 0 0 1 1.5 1.5v.72a6.5 6.5 0 0 1 1.92.8l.51-.51a1.5 1.5 0 0 1 2.12 2.12l-.51.51a6.5 6.5 0 0 1 .8 1.92H29a1.5 1.5 0 0 1 0 3h-.72a6.5 6.5 0 0 1-.8 1.92l.51.51a1.5 1.5 0 0 1-2.12 2.12l-.51-.51a6.5 6.5 0 0 1-1.92.8V29a1.5 1.5 0 0 1-3 0v-.72a6.5 6.5 0 0 1-1.92-.8l-.51.51a1.5 1.5 0 0 1-2.12-2.12l.51-.51a6.5 6.5 0 0 1-.8-1.92H15a1.5 1.5 0 0 1 0-3h.72a6.5 6.5 0 0 1 .8-1.92l-.51-.51a1.5 1.5 0 0 1 2.12-2.12l.51.51a6.5 6.5 0 0 1 1.92-.8V16a1.5 1.5 0 0 1 1.5-1.5z"
                  fill="#3b82f6"
                />
                <circle cx="22" cy="22" r="3.5" fill="white" fillOpacity="0.12"/>
                {/* Letra i */}
                <text x="22" y="26" textAnchor="middle" fontSize="8" fontWeight="bold" fill="white" fontFamily="system-ui, sans-serif">i</text>
              </svg>
              <div>
                <div className="font-semibold text-lg tracking-tight leading-tight">
                  Motor da <span className="font-extrabold">Inovação</span>
                </div>
                <span className="text-xs text-primary-foreground/60 tracking-wide">UFPR · PPGPP</span>
              </div>
            </div>

            <p className="text-sm text-primary-foreground/70 leading-relaxed mb-3">
              A Camada Ausente da Política Industrial Brasileira. 
              Infraestrutura computacional para conectar Pesquisa, Produção, Política e Patentes.
            </p>
            <div className="text-xs text-primary-foreground/60 space-y-0.5">
              <p className="font-medium text-primary-foreground/70">Doutorado em Políticas Públicas — UFPR (2025-2028)</p>
              <p><span className="text-primary-foreground/50">Doutorando:</span> <a href="https://lattes.cnpq.br/3225001061053583" target="_blank" rel="noopener noreferrer" className="hover:text-primary-foreground underline underline-offset-2 transition-colors">Decio Dalton Deliberador Filho</a></p>
              <p><span className="text-primary-foreground/50">Orientador:</span> <a href="http://lattes.cnpq.br/1832648887498998" target="_blank" rel="noopener noreferrer" className="hover:text-primary-foreground underline underline-offset-2 transition-colors">Walter Tadahiro Shima</a></p>
            </div>
          </div>

          {/* Links - Projeto */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-2 text-primary-foreground/90">
              Projeto
            </h4>
            <ul className="space-y-1">
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
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-2 text-primary-foreground/90">
              Fontes de Dados
            </h4>
            <ul className="space-y-1">
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
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-2 text-primary-foreground/90">
              Contato
            </h4>
            <ul className="space-y-2">
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
            <p>© {currentYear} Motor da Inovação · PPGPP · UFPR. Todos os direitos reservados.</p>
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
