import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';

interface GraphNode {
  id: string;
  name: string;
  type: 'scientific' | 'technological' | 'institutional' | 'company' | 'international' | 'center';
  val: number;
  color?: string;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
}

interface NetworkGraphProps {
  searchResults: {
    query: string;
    scientific: { name: string; institution: string; state: string; area: string; international?: string }[];
    technological: { title: string; applicant: string; year: string; code: string; international?: string }[];
    institutional: { name: string; type: string; status: string; value?: string }[];
    companies: { name: string; country: string; sector: string; type: string }[];
    international: { country: string; institutions: number; patents: number; relevance: string }[];
  };
}

const nodeColors: Record<string, string> = {
  center: '#1e3a5f',
  scientific: '#3b82f6',
  technological: '#9333ea',
  institutional: '#10b981',
  company: '#f59e0b',
  international: '#ef4444',
};

export default function NetworkGraph({ searchResults }: NetworkGraphProps) {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 450,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Build graph data from search results - memoized
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Center node (the search query)
    nodes.push({
      id: 'center',
      name: searchResults.query,
      type: 'center',
      val: 25,
      color: nodeColors.center,
    });

    // Scientific nodes (limit to 4)
    searchResults.scientific.slice(0, 4).forEach((group, i) => {
      const id = `sci-${i}`;
      nodes.push({
        id,
        name: group.name,
        type: 'scientific',
        val: 12,
        color: nodeColors.scientific,
      });
      links.push({ source: 'center', target: id, value: 2 });
    });

    // Technological nodes (limit to 3)
    searchResults.technological.slice(0, 3).forEach((patent, i) => {
      const id = `tech-${i}`;
      nodes.push({
        id,
        name: patent.title.length > 30 ? patent.title.substring(0, 27) + '...' : patent.title,
        type: 'technological',
        val: 10,
        color: nodeColors.technological,
      });
      links.push({ source: 'center', target: id, value: 2 });
    });

    // Institutional nodes (limit to 3)
    searchResults.institutional.slice(0, 3).forEach((inst, i) => {
      const id = `inst-${i}`;
      nodes.push({
        id,
        name: inst.name,
        type: 'institutional',
        val: 14,
        color: nodeColors.institutional,
      });
      links.push({ source: 'center', target: id, value: 2 });
    });

    // Company nodes (limit to 3)
    searchResults.companies.slice(0, 3).forEach((company, i) => {
      const id = `comp-${i}`;
      nodes.push({
        id,
        name: company.name,
        type: 'company',
        val: 9,
        color: nodeColors.company,
      });
      links.push({ source: 'center', target: id, value: 1 });
    });

    // International nodes (limit to 3)
    searchResults.international.slice(0, 3).forEach((intl, i) => {
      const id = `int-${i}`;
      nodes.push({
        id,
        name: intl.country.replace(/[🇨🇳🇺🇸🇯🇵🇰🇷🇩🇪🇫🇷🇬🇧🇨🇭🇮🇪🇳🇱]/g, '').trim(),
        type: 'international',
        val: 8,
        color: nodeColors.international,
      });
      links.push({ source: 'center', target: id, value: 1 });
    });

    return { nodes, links };
  }, [searchResults]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (fgRef.current && node.x !== undefined && node.y !== undefined) {
      fgRef.current.centerAt(node.x, node.y, 800);
      fgRef.current.zoom(1.5, 800);
    }
  }, []);

  const nodeCanvasObject = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (node.x === undefined || node.y === undefined) return;
    
    const label = node.name;
    const fontSize = Math.max(9 / globalScale, 3);
    ctx.font = `${fontSize}px Inter, sans-serif`;

    // Draw node circle
    const size = node.val / 2;
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = node.color || '#666';
    ctx.fill();

    // Add glow effect for center node
    if (node.type === 'center') {
      ctx.shadowColor = node.color || '#1e3a5f';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw label
    if (globalScale > 0.4 || node.type === 'center') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const displayLabel = label.length > 20 ? label.substring(0, 17) + '...' : label;
      const y = node.y + size + fontSize + 2;
      
      // Background for text
      const textWidth = ctx.measureText(displayLabel).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(node.x - textWidth / 2 - 2, y - fontSize / 2 - 1, textWidth + 4, fontSize + 2);
      
      // Text
      ctx.fillStyle = node.type === 'center' ? '#1e3a5f' : '#374151';
      ctx.fillText(displayLabel, node.x, y);
    }
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-border">
        <h4 className="text-sm font-semibold text-foreground mb-3">Legenda</h4>
        <div className="space-y-2">
          {[
            { type: 'center', label: 'Objeto Tecnológico' },
            { type: 'scientific', label: 'Grupos de Pesquisa' },
            { type: 'technological', label: 'Patentes' },
            { type: 'institutional', label: 'Instrumentos' },
            { type: 'company', label: 'Empresas' },
            { type: 'international', label: 'Internacional' },
          ].map(item => (
            <div key={item.type} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: nodeColors[item.type] }}
              />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredNode && hoveredNode.type !== 'center' && (
        <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-border max-w-xs">
          <div 
            className="w-3 h-3 rounded-full mb-2" 
            style={{ backgroundColor: nodeColors[hoveredNode.type] }}
          />
          <p className="text-sm font-medium text-foreground">{hoveredNode.name}</p>
          <p className="text-xs text-muted-foreground capitalize mt-1">
            {hoveredNode.type === 'scientific' ? 'Grupo de Pesquisa' :
             hoveredNode.type === 'technological' ? 'Patente' :
             hoveredNode.type === 'institutional' ? 'Instrumento Público' :
             hoveredNode.type === 'company' ? 'Empresa' :
             hoveredNode.type === 'international' ? 'Incidência Internacional' : ''}
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow text-xs text-muted-foreground">
        Arraste para explorar • Scroll para zoom • Clique para focar
      </div>

      {/* Graph */}
      <div className="rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-slate-50 to-blue-50">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeCanvasObject={nodeCanvasObject}
          nodePointerAreaPaint={(node: GraphNode, color, ctx) => {
            if (node.x === undefined || node.y === undefined) return;
            const size = node.val / 2;
            ctx.beginPath();
            ctx.arc(node.x, node.y, size + 5, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkColor={() => 'rgba(100, 116, 139, 0.4)'}
          linkWidth={1.5}
          onNodeClick={(node) => handleNodeClick(node as GraphNode)}
          onNodeHover={(node) => setHoveredNode(node as GraphNode | null)}
          cooldownTicks={50}
          d3AlphaDecay={0.05}
          d3VelocityDecay={0.4}
          enableNodeDrag={true}
          minZoom={0.5}
          maxZoom={4}
        />
      </div>
    </div>
  );
}
