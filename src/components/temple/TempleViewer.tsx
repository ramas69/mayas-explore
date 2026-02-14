import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useGamificationStore } from '../../stores/gamificationStore';
import { StudentStats } from '../profile/StudentStats';

// Temple evolution stages
const TEMPLE_STAGES = [
  { name: 'Ruines', color: '#5a5a5a', glow: 0, particles: 0 },
  { name: 'Fondations', color: '#8b7355', glow: 0.2, particles: 10 },
  { name: 'Structure', color: '#a08060', glow: 0.4, particles: 25 },
  { name: 'Dorures', color: '#c9a227', glow: 0.6, particles: 50 },
  { name: 'Majestueux', color: '#ffd700', glow: 0.8, particles: 100 },
  { name: 'Divin', color: '#ffec8b', glow: 1, particles: 200 },
];

function TempleModel({ stage }: { stage: number }) {
  const meshRef = useRef<THREE.Group>(null);
  const stageData = TEMPLE_STAGES[Math.min(stage, TEMPLE_STAGES.length - 1)];

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Base */}
      <mesh position={[0, -2, 0]}>
        <boxGeometry args={[4, 1, 4]} />
        <meshStandardMaterial color={stageData.color} />
      </mesh>

      {/* Steps */}
      {[...Array(3)].map((_, i) => (
        <mesh key={i} position={[0, -1.5 + i * 0.3, 0]}>
          <boxGeometry args={[3.5 - i * 0.3, 0.3, 3.5 - i * 0.3]} />
          <meshStandardMaterial color={stageData.color} />
        </mesh>
      ))}

      {/* Main Structure */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 3, 2]} />
        <meshStandardMaterial
          color={stageData.color}
          emissive={stageData.color}
          emissiveIntensity={stageData.glow * 0.3}
        />
      </mesh>

      {/* Columns */}
      {[
        [-0.8, -0.8],
        [0.8, -0.8],
        [-0.8, 0.8],
        [0.8, 0.8],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.5, z]}>
          <cylinderGeometry args={[0.1, 0.1, 3, 8]} />
          <meshStandardMaterial
            color={stageData.color}
            emissive={stageData.color}
            emissiveIntensity={stageData.glow * 0.5}
          />
        </mesh>
      ))}

      {/* Top Platform */}
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[2.5, 0.3, 2.5]} />
        <meshStandardMaterial color={stageData.color} />
      </mesh>

      {/* Pyramid Top */}
      <mesh position={[0, 3, 0]}>
        <coneGeometry args={[1.5, 1.5, 4]} />
        <meshStandardMaterial
          color={stageData.color}
          emissive={stageData.color}
          emissiveIntensity={stageData.glow}
        />
      </mesh>

      {/* Glow Effect */}
      {stageData.glow > 0 && (
        <pointLight
          position={[0, 2, 0]}
          color={stageData.color}
          intensity={stageData.glow * 2}
          distance={10}
        />
      )}
    </group>
  );
}

function FloatingParticles({ count, color }: { count: number; color: string }) {
  const points = useRef<THREE.Points>(null);
  const [positions] = useState(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return positions;
  });

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.elapsedTime * 0.05;
      const positions = points.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] += Math.sin(state.clock.elapsedTime + i) * 0.002;
      }
      points.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color={color}
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

function Scene({ stage }: { stage: number }) {
  const stageData = TEMPLE_STAGES[Math.min(stage, TEMPLE_STAGES.length - 1)];

  return (
    <>
      {/* Ambient Light */}
      <ambientLight intensity={0.3} />

      {/* Directional Light (Moon/Sun) */}
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.8}
        color="#ffd700"
      />

      {/* Stars */}
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />

      {/* Temple */}
      <TempleModel stage={stage} />

      {/* Floating Particles */}
      <FloatingParticles count={stageData.particles} color={stageData.color} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          color="#0a1628"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Fog */}
      <fog attach="fog" args={['#0a1628', 10, 50]} />

      {/* Controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={5}
        maxDistance={15}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
}

export function TempleViewer() {
  const { gamification } = useGamificationStore();
  const stage = gamification?.temple_evolution_stage || 0;
  const stageData = TEMPLE_STAGES[Math.min(stage, TEMPLE_STAGES.length - 1)];

  return (
    <div className="min-h-[400px] sm:min-h-[500px] h-full flex flex-col gap-6">
      {/* 3D Canvas Section */}
      <div className="flex-1 flex flex-col">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-['Cinzel_Decorative'] text-lg sm:text-xl font-bold text-amber-100 truncate">
            Ton Temple Maya
          </h3>
          <span className="text-amber-400 font-['Cinzel_Decorative'] text-sm">
            Stade : {stageData.name}
          </span>
        </div>
        <div className="flex-1 min-h-[300px] rounded-xl sm:rounded-2xl overflow-hidden border border-amber-500/20 shadow-2xl shadow-amber-900/20 relative">
          <Canvas
            camera={{ position: [5, 3, 5], fov: 50 }}
            style={{ background: 'linear-gradient(to bottom, #0a1628, #0d3b2e)' }}
          >
            <Scene stage={stage} />
          </Canvas>
          {/* Stage Indicators Overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-1.5 sm:gap-2 flex-wrap pointer-events-none">
            {TEMPLE_STAGES.map((s, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-500 ${i <= stage
                    ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]'
                    : 'bg-slate-700'
                  }`}
                title={s.name}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <StudentStats />
    </div>
  );
}
