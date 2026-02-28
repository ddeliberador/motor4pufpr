import { useMemo } from "react";
import type { MotorSearchResult } from "@/hooks/useMotorSearch";

interface RelationalGraphProps {
  data: MotorSearchResult;
}

interface GraphNode {
  id: string;
  label: string;
  type: "query" | "institution" | "contract" | "convenio" | "country" | "repo";
  size: number;
}

interface GraphEdge {
  from: string;
  to: string;
  type: "produces" | "funds" | "cooperates" | "depends";
}

const typeLabels: Record<string, string> = {
  query: "Objeto Tecnológico",
  institution: "Instituição",
  contract: "Licitação",
  convenio: "Convênio",
  country: "País",
  repo: "Repositório",
};

export default function RelationalGraph({ data }: RelationalGraphProps) {
  const knowledge = data.layers.knowledge;
  const policy = data.layers.policy;

  const { nodes, edges, alerts } = useMemo(() => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const alerts: string[] = [];

    nodes.push({ id: "q", label: data.query, type: "query", size: 3 });

    const instEntries = Object.entries(knowledge.institutions || {}).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 6);
    instEntries.forEach(([name, count], i) => {
      const id = `inst-${i}`;
      nodes.push({ id, label: name, type: "institution", size: Math.min(count as number, 8) });
      edges.push({ from: "q", to: id, type: "produces" });
    });

    const contracts = (policy?.contracts || []).slice(0, 4);
    contracts.forEach((c, i) => {
      const id = `ct-${i}`;
      const label = c.organ?.slice(0, 25) || c.object?.slice(0, 25) || "Contrato";
      nodes.push({ id, label, type: "contract", size: 2 });
      edges.push({ from: "q", to: id, type: "funds" });
      const matchInst = instEntries.findIndex(([name]) =>
        name.toLowerCase().includes((c.organ || "").toLowerCase().slice(0, 12)) ||
        (c.organ || "").toLowerCase().includes(name.toLowerCase().slice(0, 12))
      );
      if (matchInst >= 0) {
        edges.push({ from: `inst-${matchInst}`, to: id, type: "cooperates" });
      }
    });

    const convenios = (policy?.convenios || []).slice(0, 3);
    convenios.forEach((c, i) => {
      const id = `cv-${i}`;
      nodes.push({ id, label: c.proponent?.slice(0, 25) || "Convênio", type: "convenio", size: 2 });
      edges.push({ from: "q", to: id, type: "funds" });
    });

    const countries = (knowledge?.international || [])
      .filter((c) => c.country_code !== "BR")
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    countries.forEach((c, i) => {
      const id = `co-${i}`;
      nodes.push({ id, label: c.country_code, type: "country", size: Math.min(Math.round(c.count / 50), 5) });
      edges.push({ from: "q", to: id, type: "depends" });
    });

    const isolatedInstitutions = instEntries.filter(([name]) => {
      const hasContractLink = contracts.some(c =>
        (c.organ || "").toLowerCase().includes(name.toLowerCase().slice(0, 10))
      );
      return !hasContractLink;
    });
    if (isolatedInstitutions.length > instEntries.length * 0.7) {
      alerts.push(`${isolatedInstitutions.length} de ${instEntries.length} instituições sem vínculo com contratos públicos — desarticulação U-E`);
    }
    const brCount = knowledge?.international?.find((c) => c.country_code === "BR")?.count || 0;
    if (countries.length > 0 && countries[0].count > brCount) {
      alerts.push(`${countries[0].country_code} produz mais que o Brasil neste tema — dependência externa`);
    }

    return { nodes, edges, alerts };
  }, [data, knowledge, policy]);

  const cx = 300, cy = 200;
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    positions["q"] = { x: cx, y: cy };
    const nonCenter = nodes.filter(n => n.id !== "q");
    const angleStep = (2 * Math.PI) / Math.max(nonCenter.length, 1);
    nonCenter.forEach((n, i) => {
      const radius = n.type === "institution" ? 120 : n.type === "country" ? 160 : 140;
      positions[n.id] = {
        x: cx + radius * Math.cos(i * angleStep - Math.PI / 2),
        y: cy + radius * Math.sin(i * angleStep - Math.PI / 2),
      };
    });
    return positions;
  }, [nodes]);

  const edgeColors: Record<string, string> = {
    produces: "hsl(var(--primary) / 0.3)",
    funds: "hsl(var(--chart-2) / 0.4)",
    cooperates: "hsl(var(--chart-3) / 0.5)",
    depends: "hsl(var(--destructive) / 0.4)",
  };

  const nodeColorMap: Record<string, string> = {
    query: "hsl(var(--primary))",
    institution: "hsl(var(--chart-1))",
    contract: "hsl(var(--chart-2))",
    convenio: "hsl(var(--chart-3))",
    country: "hsl(var(--chart-4))",
    repo: "hsl(var(--chart-5))",
  };

  return (
    <div className="space-y-3">
      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 bg-destructive/5 border border-destructive/20 rounded-lg">
              <span className="text-destructive text-xs mt-0.5">⚠</span>
              <p className="text-xs text-foreground">{alert}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Mapa Relacional</h3>
          <div className="flex gap-3">
            {Object.entries(typeLabels).filter(([k]) => k !== "query").map(([type, label]) => (
              <div key={type} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: nodeColorMap[type] }} />
                <span className="text-[9px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <svg viewBox="0 0 600 400" className="w-full h-[350px]">
          {edges.map((e, i) => {
            const from = nodePositions[e.from];
            const to = nodePositions[e.to];
            if (!from || !to) return null;
            return (
              <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={edgeColors[e.type] || "hsl(var(--border))"}
                strokeWidth={e.type === "cooperates" ? 2.5 : 1.5}
                strokeDasharray={e.type === "depends" ? "4 3" : undefined}
              />
            );
          })}
          {nodes.map(n => {
            const pos = nodePositions[n.id];
            if (!pos) return null;
            const r = n.id === "q" ? 22 : 8 + n.size * 2;
            return (
              <g key={n.id}>
                <circle cx={pos.x} cy={pos.y} r={r}
                  fill={nodeColorMap[n.type] || "hsl(var(--muted))"}
                  opacity={0.85}
                />
                <text x={pos.x} y={pos.y + r + 12}
                  textAnchor="middle" fontSize={n.id === "q" ? 11 : 9}
                  fill="hsl(var(--foreground))" fontWeight={n.id === "q" ? 600 : 400}
                  className="select-none"
                >
                  {n.label.length > 22 ? n.label.slice(0, 19) + "…" : n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
