import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Nós do grafo — representam instituições, conceitos, papers
const GraphNodes = () => {
  const groupRef = useRef<THREE.Group>(null);

  const nodes = useMemo(() => {
    const result: { pos: THREE.Vector3; size: number; opacity: number }[] = [];
    // Nó central (maior)
    result.push({ pos: new THREE.Vector3(0, 0, 0), size: 0.06, opacity: 0.9 });
    // Camada 1 — 6 nós próximos
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const r = 1.2 + Math.random() * 0.3;
      result.push({
        pos: new THREE.Vector3(Math.cos(angle) * r, (Math.random() - 0.5) * 0.8, Math.sin(angle) * r),
        size: 0.035 + Math.random() * 0.025,
        opacity: 0.6 + Math.random() * 0.3,
      });
    }
    // Camada 2 — 14 nós mais distantes
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + 0.2;
      const r = 2.2 + Math.random() * 0.8;
      result.push({
        pos: new THREE.Vector3(Math.cos(angle) * r, (Math.random() - 0.5) * 1.5, Math.sin(angle) * r),
        size: 0.015 + Math.random() * 0.02,
        opacity: 0.25 + Math.random() * 0.25,
      });
    }
    return result;
  }, []);

  const edges = useMemo(() => {
    const result: { from: number; to: number }[] = [];
    // Nó central conecta com camada 1
    for (let i = 1; i <= 6; i++) result.push({ from: 0, to: i });
    // Conexões dentro da camada 1
    result.push({ from: 1, to: 2 }, { from: 2, to: 4 }, { from: 3, to: 5 }, { from: 4, to: 6 });
    // Camada 1 → camada 2
    for (let i = 7; i <= 20; i++) {
      const parent = 1 + Math.floor(Math.random() * 6);
      result.push({ from: parent, to: i });
    }
    return result;
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Rotação muito lenta — quase imperceptível
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Arestas */}
      {edges.map((edge, i) => {
        const from = nodes[edge.from].pos;
        const to = nodes[edge.to]?.pos;
        if (!to) return null;
        const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
        const mat = new THREE.LineBasicMaterial({ color: "#334155", transparent: true, opacity: 0.18 });
        return <primitive key={`edge-${i}`} object={new THREE.Line(geo, mat)} />;
      })}
      {/* Nós */}
      {nodes.map((node, i) => (
        <mesh key={`node-${i}`} position={node.pos}>
          <sphereGeometry args={[node.size, 8, 8]} />
          <meshBasicMaterial
            color={i === 0 ? "#60a5fa" : i <= 6 ? "#93c5fd" : "#475569"}
            transparent
            opacity={node.opacity}
          />
        </mesh>
      ))}
    </group>
  );
};

// Grade de pontos — referência a matrizes de dados científicos
const DataGrid = () => {
  const points = useMemo(() => {
    const result: THREE.Vector3[] = [];
    const cols = 18;
    const rows = 10;
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        result.push(new THREE.Vector3(
          (x / (cols - 1) - 0.5) * 12,
          (y / (rows - 1) - 0.5) * 6,
          -2
        ));
      }
    }
    return result;
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points);
    return g;
  }, [points]);

  return (
    <points geometry={geo}>
      <pointsMaterial color="#1e3a5f" size={0.025} transparent opacity={0.4} />
    </points>
  );
};

const Scene = () => (
  <>
    <ambientLight intensity={0.1} />
    <pointLight position={[0, 0, 3]} intensity={0.8} color="#3b82f6" distance={8} />
    <DataGrid />
    <GraphNodes />
  </>
);

const ElectricScene = () => (
  <div className="absolute inset-0 z-0">
    <Canvas
      camera={{ position: [0, 0.5, 5.5], fov: 55 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
      dpr={[1, 1.5]}
    >
      <Scene />
    </Canvas>
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: "radial-gradient(ellipse at center, transparent 30%, hsl(222 47% 6%) 80%)",
      }}
    />
  </div>
);

export default ElectricScene;
