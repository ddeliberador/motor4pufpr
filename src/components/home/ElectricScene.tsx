import { useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ─── Electric Arc (lightning bolt between two points) ─── */
const ElectricArc = ({ start, end, intensity = 1 }: { start: THREE.Vector3; end: THREE.Vector3; intensity?: number }) => {
  const lineRef = useRef<THREE.Line>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!lineRef.current) return;
    const t = clock.getElapsedTime();
    const points: THREE.Vector3[] = [];
    const segments = 20;
    const dir = end.clone().sub(start);

    for (let i = 0; i <= segments; i++) {
      const frac = i / segments;
      const point = start.clone().add(dir.clone().multiplyScalar(frac));
      if (i > 0 && i < segments) {
        const jitter = Math.sin(t * 15 + i * 3) * 0.15 * intensity * (1 - Math.abs(frac - 0.5) * 2);
        const jitter2 = Math.cos(t * 20 + i * 5) * 0.1 * intensity * (1 - Math.abs(frac - 0.5) * 2);
        point.x += jitter;
        point.y += jitter2;
        point.z += Math.sin(t * 12 + i * 7) * 0.08 * intensity;
      }
      points.push(point);
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    lineRef.current.geometry.dispose();
    lineRef.current.geometry = geo;

    if (materialRef.current) {
      const flicker = 0.4 + Math.abs(Math.sin(t * 8 + intensity * 10)) * 0.6;
      materialRef.current.opacity = flicker * intensity;
    }
  });

  return (
    <line ref={lineRef as any}>
      <bufferGeometry />
      <lineBasicMaterial
        ref={materialRef}
        color="#60a5fa"
        transparent
        opacity={0.8}
        linewidth={1}
      />
    </line>
  );
};

/* ─── Rotating Gear Ring ─── */
const GearRing = ({ radius, teeth, thickness, speed, y, color }: {
  radius: number; teeth: number; thickness: number; speed: number; y: number; color: string;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const gearShape = useMemo(() => {
    const shape = new THREE.Shape();
    const innerR = radius - 0.08;
    const outerR = radius + 0.08;
    const toothH = 0.15;
    const segments = teeth * 4;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const toothPhase = Math.floor((i / segments) * teeth) % 2;
      const r = toothPhase === 0 ? outerR + toothH : outerR;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    }
    shape.closePath();

    const hole = new THREE.Path();
    const holeSegs = 64;
    for (let i = 0; i <= holeSegs; i++) {
      const angle = (i / holeSegs) * Math.PI * 2;
      const x = Math.cos(angle) * innerR;
      const z = Math.sin(angle) * innerR;
      if (i === 0) hole.moveTo(x, z);
      else hole.lineTo(x, z);
    }
    shape.holes.push(hole);
    return shape;
  }, [radius, teeth]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += speed * 0.005;
    }
    if (glowRef.current) {
      const t = clock.getElapsedTime();
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.08 + Math.sin(t * 3 + radius) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <extrudeGeometry args={[gearShape, { depth: thickness, bevelEnabled: false }]} />
        <meshStandardMaterial
          color={color}
          metalness={0.9}
          roughness={0.2}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Glow ring */}
      <mesh ref={glowRef} position={[0, 0, thickness / 2]}>
        <ringGeometry args={[radius - 0.3, radius + 0.5, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

/* ─── Energy Particles ─── */
const EnergyParticles = ({ count = 300 }: { count?: number }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particleData = useMemo(() => {
    return Array.from({ length: count }, () => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 6
      ),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      ),
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 2,
      size: 0.01 + Math.random() * 0.03,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    particleData.forEach((p, i) => {
      // Spiral motion toward center
      const angle = t * p.speed + p.phase;
      const dist = p.pos.length();
      const pullStrength = 0.001;

      p.pos.x += p.vel.x + Math.sin(angle) * 0.005 - p.pos.x * pullStrength;
      p.pos.y += p.vel.y + Math.cos(angle) * 0.005 - p.pos.y * pullStrength;
      p.pos.z += p.vel.z + Math.sin(angle * 0.7) * 0.003;

      // Reset if too close to center
      if (dist < 0.3) {
        p.pos.set(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 6
        );
      }

      const scale = p.size * (0.5 + Math.sin(t * 5 + p.phase) * 0.5);
      dummy.position.copy(p.pos);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#93c5fd" transparent opacity={0.7} />
    </instancedMesh>
  );
};

/* ─── Central Energy Core ─── */
const EnergyCore = () => {
  const coreRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.5 + Math.sin(t * 4) * 0.8;
      coreRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
    }
    if (outerRef.current) {
      const mat = outerRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.1 + Math.sin(t * 2) * 0.06;
      outerRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.08);
    }
    if (ringsRef.current) {
      ringsRef.current.rotation.x = Math.sin(t * 0.5) * 0.3;
      ringsRef.current.rotation.y = t * 0.3;
    }
  });

  return (
    <group>
      {/* Inner glowing core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={2}
          metalness={0.5}
          roughness={0.1}
        />
      </mesh>
      {/* Outer glow */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.12} />
      </mesh>
      {/* Energy rings */}
      <group ref={ringsRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.6, 0.015, 16, 64]} />
          <meshBasicMaterial color="#93c5fd" transparent opacity={0.5} />
        </mesh>
        <mesh rotation={[Math.PI / 3, Math.PI / 4, 0]}>
          <torusGeometry args={[0.8, 0.01, 16, 64]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.3} />
        </mesh>
        <mesh rotation={[Math.PI / 6, -Math.PI / 3, 0]}>
          <torusGeometry args={[1.0, 0.008, 16, 64]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} />
        </mesh>
      </group>
    </group>
  );
};

/* ─── Electric Arcs Network ─── */
const ArcNetwork = () => {
  const arcsData = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = 2 + Math.random() * 1.5;
      points.push(new THREE.Vector3(
        Math.cos(angle) * r,
        (Math.random() - 0.5) * 2,
        Math.sin(angle) * r
      ));
    }
    const arcs: { start: THREE.Vector3; end: THREE.Vector3; intensity: number }[] = [];
    // Arcs from center to outer points
    const center = new THREE.Vector3(0, 0, 0);
    points.forEach((p, i) => {
      arcs.push({ start: center, end: p, intensity: 0.5 + Math.random() * 0.5 });
      // Some arcs between adjacent points
      if (i < points.length - 1 && Math.random() > 0.4) {
        arcs.push({ start: p, end: points[i + 1], intensity: 0.3 + Math.random() * 0.4 });
      }
    });
    return arcs;
  }, []);

  return (
    <group>
      {arcsData.map((arc, i) => (
        <ElectricArc key={i} start={arc.start} end={arc.end} intensity={arc.intensity} />
      ))}
    </group>
  );
};

/* ─── Pulsing Magnetic Field Lines ─── */
const MagneticField = () => {
  const groupRef = useRef<THREE.Group>(null);

  const fieldLines = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      for (let j = 0; j <= 40; j++) {
        const t = (j / 40) * Math.PI;
        const r = 2.5 * Math.sin(t);
        const y = 2.5 * Math.cos(t);
        points.push(new THREE.Vector3(
          r * Math.cos(angle),
          y,
          r * Math.sin(angle)
        ));
      }
      lines.push(points);
    }
    return lines;
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {fieldLines.map((points, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={points.length}
              array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#3b82f6" transparent opacity={0.06} />
        </line>
      ))}
    </group>
  );
};

/* ─── Scene ─── */
const Scene = () => {
  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 0]} intensity={3} color="#3b82f6" distance={10} />
      <pointLight position={[3, 2, 2]} intensity={0.8} color="#1d4ed8" />
      <pointLight position={[-3, -2, 2]} intensity={0.5} color="#60a5fa" />

      <EnergyCore />
      <GearRing radius={1.3} teeth={24} thickness={0.08} speed={1} y={0} color="#475569" />
      <GearRing radius={1.8} teeth={32} thickness={0.06} speed={-0.7} y={0.15} color="#334155" />
      <GearRing radius={2.4} teeth={40} thickness={0.04} speed={0.4} y={-0.1} color="#1e293b" />
      <ArcNetwork />
      <MagneticField />
      <EnergyParticles count={250} />
    </>
  );
};

const ElectricScene = () => {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
      >
        <Scene />
      </Canvas>
      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 20%, hsl(222 47% 6%) 75%)",
        }}
      />
    </div>
  );
};

export default ElectricScene;
