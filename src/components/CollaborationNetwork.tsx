import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';

interface NetworkNode {
  id: string;
  name: string;
  type: 'federal' | 'estadual' | 'ict' | 'center';
  state: string;
  val: number;
  color?: string;
  x?: number;
  y?: number;
}

interface NetworkLink {
  source: string;
  target: string;
  value: number;
  projects: number;
}

interface CollaborationNetworkProps {
  hasSearched: boolean;
}

// Colors using design tokens conceptually
const nodeColors: Record<string, string> = {
  federal: '#1e3a5f', // primary
  estadual: '#2d5a4a', // accent  
  ict: '#6366f1', // indigo
  center: '#dc2626', // red for strategic centers
};

// Mock collaboration data - universities and their research partnerships
const collaborationData = {
  nodes: [
    { id: 'usp', name: 'USP', type: 'federal' as const, state: 'SP', val: 25 },
    { id: 'unicamp', name: 'Unicamp', type: 'estadual' as const, state: 'SP', val: 22 },
    { id: 'ufrj', name: 'UFRJ', type: 'federal' as const, state: 'RJ', val: 20 },
    { id: 'ufmg', name: 'UFMG', type: 'federal' as const, state: 'MG', val: 18 },
    { id: 'ufrgs', name: 'UFRGS', type: 'federal' as const, state: 'RS', val: 16 },
    { id: 'ufsc', name: 'UFSC', type: 'federal' as const, state: 'SC', val: 15 },
    { id: 'ufpr', name: 'UFPR', type: 'federal' as const, state: 'PR', val: 14 },
    { id: 'ufpe', name: 'UFPE', type: 'federal' as const, state: 'PE', val: 13 },
    { id: 'unesp', name: 'UNESP', type: 'estadual' as const, state: 'SP', val: 14 },
    { id: 'pucrio', name: 'PUC-Rio', type: 'estadual' as const, state: 'RJ', val: 12 },
    { id: 'fiocruz', name: 'Fiocruz', type: 'ict' as const, state: 'RJ', val: 18 },
    { id: 'embrapa', name: 'Embrapa', type: 'ict' as const, state: 'DF', val: 17 },
    { id: 'cnpem', name: 'CNPEM', type: 'center' as const, state: 'SP', val: 15 },
    { id: 'inpe', name: 'INPE', type: 'ict' as const, state: 'SP', val: 12 },
    { id: 'butantan', name: 'Butantan', type: 'ict' as const, state: 'SP', val: 13 },
  ],
  links: [
    // USP connections (hub)
    { source: 'usp', target: 'unicamp', value: 3, projects: 45 },
    { source: 'usp', target: 'ufrj', value: 2.5, projects: 38 },
    { source: 'usp', target: 'ufmg', value: 2, projects: 28 },
    { source: 'usp', target: 'fiocruz', value: 2.5, projects: 32 },
    { source: 'usp', target: 'cnpem', value: 3, projects: 42 },
    { source: 'usp', target: 'butantan', value: 2.5, projects: 35 },
    { source: 'usp', target: 'unesp', value: 2, projects: 25 },
    
    // Unicamp connections
    { source: 'unicamp', target: 'ufrj', value: 2, projects: 24 },
    { source: 'unicamp', target: 'ufmg', value: 2, projects: 22 },
    { source: 'unicamp', target: 'cnpem', value: 2.5, projects: 30 },
    { source: 'unicamp', target: 'embrapa', value: 1.5, projects: 18 },
    { source: 'unicamp', target: 'unesp', value: 2, projects: 21 },
    
    // UFRJ connections
    { source: 'ufrj', target: 'fiocruz', value: 3, projects: 48 },
    { source: 'ufrj', target: 'pucrio', value: 2, projects: 26 },
    { source: 'ufrj', target: 'ufmg', value: 1.5, projects: 16 },
    
    // UFMG connections  
    { source: 'ufmg', target: 'fiocruz', value: 1.5, projects: 14 },
    { source: 'ufmg', target: 'embrapa', value: 1.5, projects: 15 },
    
    // Sul connections
    { source: 'ufrgs', target: 'ufsc', value: 2, projects: 20 },
    { source: 'ufrgs', target: 'ufpr', value: 1.5, projects: 16 },
    { source: 'ufsc', target: 'ufpr', value: 2, projects: 22 },
    { source: 'ufpr', target: 'embrapa', value: 1.5, projects: 12 },
    
    // Cross-regional
    { source: 'ufrgs', target: 'usp', value: 1.5, projects: 15 },
    { source: 'ufpe', target: 'usp', value: 1, projects: 10 },
    { source: 'ufpe', target: 'ufrj', value: 1, projects: 9 },
    { source: 'inpe', target: 'usp', value: 2, projects: 22 },
    { source: 'inpe', target: 'ufrj', value: 1.5, projects: 14 },
    
    // ICT collaborations
    { source: 'fiocruz', target: 'butantan', value: 2.5, projects: 28 },
    { source: 'embrapa', target: 'inpe', value: 1.5, projects: 12 },
  ],
};

export default function CollaborationNetwork({ hasSearched }: CollaborationNetworkProps) {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<NetworkLink | null>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 500,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const graphData = useMemo(() => {
    const nodes: NetworkNode[] = collaborationData.nodes.map(node => ({
      ...node,
      color: nodeColors[node.type],
    }));

    return { 
      nodes, 
      links: collaborationData.links 
    };
  }, []);

  // Get connections for selected node
  const selectedNodeConnections = useMemo(() => {
    if (!selectedNode) return [];
    return collaborationData.links
      .filter(link => link.source === selectedNode.id || link.target === selectedNode.id)
      .map(link => {
        const partnerId = link.source === selectedNode.id ? link.target : link.source;
        const partner = collaborationData.nodes.find(n => n.id === partnerId);
        return { ...link, partnerName: partner?.name || partnerId, partnerId };
      })
      .sort((a, b) => b.projects - a.projects);
  }, [selectedNode]);

  const handleNodeClick = useCallback((node: NetworkNode) => {
    if (fgRef.current && node.x !== undefined && node.y !== undefined) {
      fgRef.current.centerAt(node.x, node.y, 800);
      fgRef.current.zoom(2, 800);
    }
    setSelectedNode(node);
  }, []);

  const nodeCanvasObject = useCallback((node: NetworkNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (node.x === undefined || node.y === undefined) return;
    
    const label = node.name;
    const fontSize = Math.max(10 / globalScale, 4);
    ctx.font = `600 ${fontSize}px Inter, sans-serif`;

    const size = node.val / 2;
    const isSelected = selectedNode?.id === node.id;
    const isHovered = hoveredNode?.id === node.id;
    
    // Draw outer ring for selected/hovered
    if (isSelected || isHovered) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
      ctx.strokeStyle = isSelected ? '#f59e0b' : 'rgba(0,0,0,0.3)';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
    }

    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = node.color || '#666';
    ctx.fill();

    // Draw label
    if (globalScale > 0.6 || isSelected || isHovered) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const y = node.y + size + fontSize + 3;
      
      // Background for text
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(node.x - textWidth / 2 - 3, y - fontSize / 2 - 2, textWidth + 6, fontSize + 4);
      
      // Text
      ctx.fillStyle = '#1e293b';
      ctx.fillText(label, node.x, y);
      
      // State label
      if (globalScale > 1.2) {
        ctx.font = `${fontSize * 0.7}px Inter, sans-serif`;
        ctx.fillStyle = '#64748b';
        ctx.fillText(node.state, node.x, y + fontSize);
      }
    }
  }, [selectedNode, hoveredNode]);

  const linkCanvasObject = useCallback((link: NetworkLink, ctx: CanvasRenderingContext2D) => {
    const sourceNode = graphData.nodes.find(n => n.id === (typeof link.source === 'string' ? link.source : (link.source as any).id));
    const targetNode = graphData.nodes.find(n => n.id === (typeof link.target === 'string' ? link.target : (link.target as any).id));
    
    if (!sourceNode?.x || !sourceNode?.y || !targetNode?.x || !targetNode?.y) return;
    
    const isConnectedToSelected = selectedNode && 
      (sourceNode.id === selectedNode.id || targetNode.id === selectedNode.id);
    
    ctx.beginPath();
    ctx.moveTo(sourceNode.x, sourceNode.y);
    ctx.lineTo(targetNode.x, targetNode.y);
    
    if (isConnectedToSelected) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
      ctx.lineWidth = link.value * 1.5;
    } else {
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
      ctx.lineWidth = link.value;
    }
    ctx.stroke();
  }, [selectedNode, graphData.nodes]);

  if (!hasSearched) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8">
        <div className="aspect-[16/9] flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <p className="text-muted-foreground">Pesquise um objeto tecnológico para visualizar a rede de colaboração</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl overflow-hidden" ref={containerRef}>
        <div className="relative">
          {/* Legend */}
          <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-border">
            <h4 className="text-sm font-semibold text-foreground mb-3">Tipo de Instituição</h4>
            <div className="space-y-2">
              {[
                { type: 'federal', label: 'Universidade Federal' },
                { type: 'estadual', label: 'Universidade Estadual' },
                { type: 'ict', label: 'ICT / Instituto' },
                { type: 'center', label: 'Centro Estratégico' },
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
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <strong>Tamanho:</strong> Nº de colaborações
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Linhas:</strong> Projetos conjuntos
              </p>
            </div>
          </div>

          {/* Selected node info */}
          {selectedNode && (
            <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-border w-72">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: nodeColors[selectedNode.type] }}
                  />
                  <h4 className="font-semibold text-foreground">{selectedNode.name}</h4>
                </div>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {selectedNode.type === 'federal' ? 'Universidade Federal' : 
                 selectedNode.type === 'estadual' ? 'Universidade Estadual' :
                 selectedNode.type === 'ict' ? 'ICT / Instituto' : 'Centro Estratégico'} — {selectedNode.state}
              </p>
              
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Principais colaborações:</p>
                {selectedNodeConnections.slice(0, 5).map((conn, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{conn.partnerName}</span>
                    <span className="text-foreground font-medium">{conn.projects} projetos</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow text-xs text-muted-foreground">
            Clique em uma instituição para ver colaborações • Arraste para explorar • Scroll para zoom
          </div>

          {/* Graph */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/50">
            <ForceGraph2D
              ref={fgRef}
              graphData={graphData}
              width={dimensions.width}
              height={dimensions.height}
              nodeCanvasObject={nodeCanvasObject}
              linkCanvasObject={linkCanvasObject}
              nodePointerAreaPaint={(node: NetworkNode, color, ctx) => {
                if (node.x === undefined || node.y === undefined) return;
                const size = node.val / 2;
                ctx.beginPath();
                ctx.arc(node.x, node.y, size + 5, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
              }}
              onNodeClick={(node) => handleNodeClick(node as NetworkNode)}
              onNodeHover={(node) => setHoveredNode(node as NetworkNode | null)}
              onLinkHover={(link) => setHoveredLink(link as NetworkLink | null)}
              cooldownTicks={100}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              enableNodeDrag={true}
              minZoom={0.5}
              maxZoom={5}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{collaborationData.nodes.length}</strong> instituições • 
              <strong className="text-foreground ml-1">{collaborationData.links.length}</strong> conexões de colaboração
            </span>
            <span>Dados simulados para demonstração — baseado em coautorias e projetos conjuntos (CNPq/Capes)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
