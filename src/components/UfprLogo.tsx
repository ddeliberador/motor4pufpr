const UfprLogo = ({ className = "w-12 h-12" }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Base/Pedestal */}
      <rect x="10" y="85" width="80" height="8" rx="1" fill="hsl(var(--primary))" />
      <rect x="5" y="90" width="90" height="5" rx="1" fill="hsl(var(--primary))" />
      
      {/* Steps */}
      <rect x="15" y="80" width="70" height="5" fill="hsl(var(--primary))" />
      
      {/* Building columns - 6 columns in neoclassical style */}
      {[18, 29, 40, 51, 62, 73].map((x, i) => (
        <g key={i}>
          {/* Column shaft */}
          <rect x={x} y="35" width="8" height="45" fill="hsl(var(--primary))" />
          {/* Column capital (top detail) */}
          <rect x={x - 1} y="32" width="10" height="4" fill="hsl(var(--primary))" />
          {/* Column base */}
          <rect x={x - 1} y="78" width="10" height="3" fill="hsl(var(--primary))" />
        </g>
      ))}
      
      {/* Architrave (top beam) */}
      <rect x="12" y="28" width="76" height="5" fill="hsl(var(--primary))" />
      
      {/* Pediment (triangle roof) */}
      <polygon points="50,8 12,28 88,28" fill="hsl(var(--primary))" />
      
      {/* Inner pediment detail */}
      <polygon points="50,14 22,26 78,26" fill="hsl(var(--background))" />
      
      {/* UFPR Text inside pediment - simplified */}
      <text
        x="50"
        y="24"
        textAnchor="middle"
        fill="hsl(var(--primary))"
        fontSize="8"
        fontWeight="bold"
        fontFamily="serif"
      >
        UFPR
      </text>
    </svg>
  );
};

export default UfprLogo;
