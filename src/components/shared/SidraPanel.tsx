import { ExternalLink, Building2, Factory, GraduationCap, BarChart3, MapPin } from "lucide-react";

interface SidraData {
  pintec?: any;
  cempre?: any;
  pos_graduacao?: any;
  pib_setorial?: any;
  graduacao?: any;
  cnae_divisions?: { code: string; label: string }[];
  sources?: string[];
}

const CardShell = ({
  title,
  icon,
  url,
  subtitle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  url?: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <div className="bg-card border border-border rounded-xl p-5">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">{icon} {title}</h3>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer"
           className="text-[10px] text-primary hover:underline flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> SIDRA/IBGE
        </a>
      )}
    </div>
    {subtitle && <p className="text-[10px] text-muted-foreground mb-3">{subtitle}</p>}
    {children}
  </div>
);

const SidraPanel = ({ sidra }: { sidra: SidraData | null | undefined }) => {
  if (!sidra) return null;

  const { pintec, cempre, pos_graduacao, pib_setorial, graduacao, cnae_divisions } = sidra;
  const hasAny = pintec?.setores?.length || cempre?.setores?.length || pos_graduacao?.areas?.length ||
    pib_setorial?.series?.length || graduacao?.areas?.length;

  if (!hasAny) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-xs text-muted-foreground">
          Sem retorno das tabelas do SIDRA/IBGE para esta consulta. Os blocos estruturais (PINTEC, CEMPRE, PIB setorial)
          dependem de um código CNAE identificado na tradução ontológica.
        </p>
      </div>
    );
  }

  // Agrupa PIB por período (último trimestre disponível)
  const pibPeriodos: string[] = pib_setorial?.series
    ? [...new Set(pib_setorial.series.map((s: any) => s.periodo as string))] as string[]
    : [];
  const ultimoPeriodo = pibPeriodos[pibPeriodos.length - 1];
  const pibUltimo = pib_setorial?.series?.filter((s: any) => s.periodo === ultimoPeriodo) || [];

  return (
    <div className="space-y-4">
      {cnae_divisions && cnae_divisions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {cnae_divisions.map((d, i) => (
            <span key={i} className="text-[10px] px-2 py-1 rounded-md bg-muted text-muted-foreground font-mono">
              CNAE {d.code} · {d.label}
            </span>
          ))}
        </div>
      )}

      {pintec?.setores?.length > 0 && (
        <CardShell
          title="Inovação no setor — PINTEC"
          icon={<Factory className="w-4 h-4 text-primary" />}
          url={pintec.url}
          subtitle={`${pintec.descricao} · ${pintec.periodo} · ${pintec.fonte}`}
        >
          <div className="space-y-1.5">
            {pintec.setores.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground truncate">{s.atividade}</p>
                  {s.empresas != null && (
                    <p className="text-[10px] text-muted-foreground">
                      {Number(s.inovadoras).toLocaleString("pt-BR")} inovadoras de {Number(s.empresas).toLocaleString("pt-BR")} empresas
                    </p>
                  )}
                </div>
                <span className="text-sm font-bold text-primary flex-shrink-0">{s.valor}%</span>
              </div>
            ))}
          </div>
        </CardShell>
      )}

      {cempre?.setores?.length > 0 && (
        <CardShell
          title="Empresas e pessoal ocupado — CEMPRE"
          icon={<Building2 className="w-4 h-4 text-primary" />}
          url={cempre.url}
          subtitle={`${cempre.descricao} · ${cempre.periodo} · ${cempre.fonte}`}
        >
          <div className="space-y-1.5">
            {cempre.setores.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg gap-2">
                <span className="text-xs text-foreground truncate flex-1">{s.atividade}</span>
                <div className="flex gap-3 flex-shrink-0 text-right">
                  <span className="text-[10px] text-muted-foreground">empresas <strong className="text-foreground">{s.empresas}</strong></span>
                  <span className="text-[10px] text-muted-foreground">pessoal <strong className="text-foreground">{s.pessoal}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </CardShell>
      )}

      {pibUltimo.length > 0 && (
        <CardShell
          title="PIB e valor adicionado por setor"
          icon={<BarChart3 className="w-4 h-4 text-primary" />}
          url={pib_setorial.url}
          subtitle={`${pib_setorial.descricao} · ${ultimoPeriodo} · ${pib_setorial.fonte}`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {pibUltimo.map((s: any, i: number) => (
              <div key={i} className="bg-muted/30 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground truncate">{s.componente}</p>
                <p className="text-base font-bold text-foreground">R$ {s.valor}</p>
                <p className="text-[9px] text-muted-foreground">{s.unidade}</p>
              </div>
            ))}
          </div>
        </CardShell>
      )}

      {pos_graduacao?.areas?.length > 0 && (
        <CardShell
          title="Capital humano qualificado"
          icon={<GraduationCap className="w-4 h-4 text-primary" />}
          url={pos_graduacao.url}
          subtitle={`${pos_graduacao.descricao} · ${pos_graduacao.fonte}`}
        >
          <div className="space-y-1.5">
            {pos_graduacao.areas.map((a: any, i: number) => (
              <div key={i} className="px-3 py-2 bg-muted/30 rounded-lg">
                <p className="text-xs font-medium text-foreground">{a.area}</p>
                <div className="flex flex-wrap gap-3 mt-0.5">
                  {a.series.map((s: any, j: number) => (
                    <span key={j} className="text-[10px] text-muted-foreground">
                      {s.ano}: <strong className="text-foreground">{s.valor}</strong> pessoas
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardShell>
      )}

      {graduacao?.areas?.length > 0 && (
        <CardShell
          title="Distribuição territorial do capital humano"
          icon={<MapPin className="w-4 h-4 text-primary" />}
          url={graduacao.url}
          subtitle={`${graduacao.descricao} · ${graduacao.fonte}`}
        >
          <div className="space-y-1">
            {graduacao.areas.map((a: any, i: number) => {
              const num = parseFloat(String(a.valor).replace(/\./g, "").replace(" mil", "").replace(",", "."));
              const max = parseFloat(String(graduacao.areas[0].valor).replace(/\./g, "").replace(" mil", "").replace(",", ".")) || 1;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-4 font-mono">{i + 1}</span>
                  <div className="flex-1 bg-muted rounded-full h-5 relative overflow-hidden">
                    <div className="h-full bg-primary/20 rounded-full" style={{ width: `${Math.min(100, (num / max) * 100)}%` }} />
                    <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-foreground">{a.area}</span>
                  </div>
                  <span className="text-[10px] font-bold text-primary w-16 text-right">{a.valor}</span>
                </div>
              );
            })}
          </div>
        </CardShell>
      )}
    </div>
  );
};

export default SidraPanel;
