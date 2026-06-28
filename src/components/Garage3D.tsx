import React, { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, useTexture, Text, Billboard, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '../context/GameContext';
import { CarCard } from '../types';

// Global movement state for simple mobile controls
export const moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  turnLeft: false,
  turnRight: false,
};

function Player() {
  const playerRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const { outfit } = useGame();
  
  const moveSpeed = 5;
  const turnSpeed = 2;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w': moveState.forward = true; break;
        case 's': moveState.backward = true; break;
        case 'a': moveState.left = true; break;
        case 'd': moveState.right = true; break;
        case 'q':
        case 'arrowleft': moveState.turnLeft = true; break;
        case 'e':
        case 'arrowright': moveState.turnRight = true; break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w': moveState.forward = false; break;
        case 's': moveState.backward = false; break;
        case 'a': moveState.left = false; break;
        case 'd': moveState.right = false; break;
        case 'q':
        case 'arrowleft': moveState.turnLeft = false; break;
        case 'e':
        case 'arrowright': moveState.turnRight = false; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (!playerRef.current) return;
    const controls = (state as any).controls;

    // Calculate movement vector based on camera's view direction
    const direction = new THREE.Vector3();
    const right = new THREE.Vector3();
    
    state.camera.getWorldDirection(direction);
    direction.y = 0; // Keep movement on XZ plane
    if (direction.lengthSq() < 0.001) direction.set(0, 0, -1);
    else direction.normalize();

    right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();

    const moveVector = new THREE.Vector3();
    if (moveState.forward) moveVector.add(direction);
    if (moveState.backward) moveVector.sub(direction);
    if (moveState.right) moveVector.add(right);
    if (moveState.left) moveVector.sub(right);

    if (moveVector.lengthSq() > 0.01) {
      moveVector.normalize().multiplyScalar(moveSpeed * delta);
      
      const nextPos = playerRef.current.position.clone().add(moveVector);
      
      // Collision constraints based on garage glass walls
      const BOUND_X = 24.5;
      if (nextPos.x > BOUND_X) nextPos.x = BOUND_X;
      if (nextPos.x < -BOUND_X) nextPos.x = -BOUND_X;
      if (nextPos.z > 24) nextPos.z = 24;
      if (nextPos.z < -24.5) nextPos.z = -24.5;
      
      playerRef.current.position.copy(nextPos);
      
      // Smoothly rotate player to face movement direction
      const targetAngle = Math.atan2(moveVector.x, moveVector.z);
      
      // Simple rotation towards target
      let currentRotation = playerRef.current.rotation.y;
      // Normalize angles
      while (currentRotation > Math.PI) currentRotation -= Math.PI * 2;
      while (currentRotation < -Math.PI) currentRotation += Math.PI * 2;
      let diff = targetAngle - currentRotation;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      
      playerRef.current.rotation.y += diff * 10 * delta;

      // Simulate walking animation by bobbing
      playerRef.current.position.y = 1 + Math.sin(state.clock.elapsedTime * 15) * 0.15;
    } else {
      playerRef.current.position.y = 1;
    }

    if (controls) {
       // Make orbit controls target the player's head area smoothly
       const targetPos = new THREE.Vector3().copy(playerRef.current.position).add(new THREE.Vector3(0, 1, 0));
       targetPos.y = 2; // Prevent camera from bobbing up and down
       
       const currentTarget = controls.target.clone();
       controls.target.lerp(targetPos, 0.1);
       
       // Move camera by the same delta so the player stays framed
       const deltaTarget = new THREE.Vector3().subVectors(controls.target, currentTarget);
       state.camera.position.add(deltaTarget);
    }
  });

  return (
    <group ref={playerRef} position={[0, 1, 5]}>
      {/* 3D Human - more realistic blocky character */}
      {/* Head */}
      <group position={[0, 0.8, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color={outfit.skinColor} />
        </mesh>
        
        {/* Cap */}
        {outfit.cap && (
          <group position={[0, 0.3, 0]}>
             <mesh castShadow position={[0, 0, 0]}>
               <boxGeometry args={[0.52, 0.15, 0.52]} />
               <meshStandardMaterial color={outfit.cap} />
             </mesh>
             <mesh castShadow position={[0, -0.05, -0.3]}>
               <boxGeometry args={[0.5, 0.05, 0.3]} />
               <meshStandardMaterial color={outfit.cap} />
             </mesh>
          </group>
        )}

        {/* Head/Face direction indicator or glasses */}
        <mesh position={[0, 0.1, -0.26]} castShadow>
          <boxGeometry args={[0.4, 0.15, 0.1]} />
          <meshStandardMaterial color={outfit.glasses || "#111827"} metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Torso */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[0.7, 0.9, 0.4]} />
        <meshStandardMaterial color={outfit.shirtColor} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.2, -0.7, 0]} castShadow>
        <boxGeometry args={[0.25, 0.8, 0.3]} />
        <meshStandardMaterial color={outfit.pantsColor} />
      </mesh>
      <mesh position={[0.2, -0.7, 0]} castShadow>
        <boxGeometry args={[0.25, 0.8, 0.3]} />
        <meshStandardMaterial color={outfit.pantsColor} />
      </mesh>

      {/* Arms */}
      <group position={[-0.45, 0.1, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.8, 0.2]} />
          <meshStandardMaterial color={outfit.skinColor} />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.22, 0.4, 0.22]} />
          <meshStandardMaterial color={outfit.shirtColor} />
        </mesh>
        {outfit.wristBand && (
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.22, 0.1, 0.22]} />
            <meshStandardMaterial color={outfit.wristBand} />
          </mesh>
        )}
      </group>

      <group position={[0.45, 0.1, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.8, 0.2]} />
          <meshStandardMaterial color={outfit.skinColor} />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.22, 0.4, 0.22]} />
          <meshStandardMaterial color={outfit.shirtColor} />
        </mesh>
        {outfit.wristBand && (
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.22, 0.1, 0.22]} />
            <meshStandardMaterial color={outfit.wristBand} />
          </mesh>
        )}
      </group>
    </group>
  );
}

function CarPlatform({ car, position, onClick }: { car: CarCard | null; position: [number, number, number]; onClick: () => void }) {
  const ringRef = React.useRef<THREE.Mesh>(null);
  const ringRef2 = React.useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
     if (ringRef.current) ringRef.current.rotation.z -= delta * 0.5;
     if (ringRef2.current) ringRef2.current.rotation.z += delta * 0.8;
  });

  const rarityColor = !car ? '#1f2937' : car.rarity === 'Legendary' ? '#eab308' : car.rarity === 'Rare' ? '#3b82f6' : '#9ca3af';

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerEnter={(e) => { document.body.style.cursor = 'pointer'; }} onPointerLeave={(e) => { document.body.style.cursor = 'default'; }}>
      {/* Modern Sci-Fi Platform Base */}
      <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[3.2, 3.5, 0.3, 64]} />
        <meshStandardMaterial color="#0b1120" metalness={0.9} roughness={0.2} />
      </mesh>
      
      {/* Platform Surface */}
      <mesh position={[0, 0.31, 0]} receiveShadow>
         <cylinderGeometry args={[3, 3, 0.05, 64]} />
         <meshStandardMaterial color="#020617" metalness={1} roughness={0.05} />
      </mesh>
      
      {/* Glowing Rotating Rings */}
      <mesh ref={ringRef} position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.8, 2.9, 64]} />
        <meshStandardMaterial 
          color={rarityColor}
          emissive={rarityColor}
          emissiveIntensity={car ? 4 : 1}
          toneMapped={false}
          transparent
          opacity={0.8}
        />
      </mesh>

      <mesh ref={ringRef2} position={[0, 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.5, 2.55, 32, 1, 0, Math.PI * 1.5]} />
        <meshStandardMaterial 
          color={rarityColor}
          emissive={rarityColor}
          emissiveIntensity={car ? 6 : 1.5}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Hanging Light above car */}
      <group position={[0, 6, 0]}>
         <mesh>
            <cylinderGeometry args={[1, 1, 0.2, 32]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
         </mesh>
         <mesh position={[0, -0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.9, 32]} />
            <meshStandardMaterial color={car ? "#ffffff" : "#4b5563"} emissive={car ? "#ffffff" : "#4b5563"} emissiveIntensity={car ? 5 : 1} toneMapped={false} />
         </mesh>
         <pointLight color={car ? "#ffffff" : "#4b5563"} intensity={car ? 40 : 10} distance={15} decay={2} castShadow={!!car} />
         <spotLight color={car ? "#ffffff" : "#4b5563"} position={[0, 0, 0]} angle={0.7} penumbra={0.3} intensity={car ? 100 : 20} castShadow={!!car} distance={20} />
      </group>

      {/* Car Image - Using a plane facing the camera */}
      {car ? (
        <Billboard position={[0, 2, 0]} follow={true}>
           <CarImage sprite={car.image} rotation={car.imageRotation || 0} />
           
           {/* Car Name Tag */}
           <group position={[0, -1.8, 0]}>
              <mesh position={[0, 0, -0.01]}>
                 <planeGeometry args={[4.5, 0.8]} />
                 <meshStandardMaterial color="#000000" transparent opacity={0.8} />
              </mesh>
              <Text position={[0, 0.15, 0]} fontSize={0.25} color="white" anchorX="center" anchorY="middle" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff">
                 {car.brand.toUpperCase()}
              </Text>
              <Text position={[0, -0.15, 0]} fontSize={0.35} color={
                 car.rarity === 'Legendary' ? '#eab308' : 
                 car.rarity === 'Rare' ? '#3b82f6' : '#9ca3af'
              } anchorX="center" anchorY="middle" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff">
                 {car.model.toUpperCase()}
              </Text>
           </group>
        </Billboard>
      ) : (
        <Billboard position={[0, 1.5, 0]} follow={true}>
           <Text fontSize={0.4} color="#6b7280" anchorX="center" anchorY="middle">
              EMPTY SLOT
           </Text>
           <Text position={[0, -0.5, 0]} fontSize={0.2} color="#4b5563" anchorX="center" anchorY="middle">
              CLICK TO ASSIGN
           </Text>
        </Billboard>
      )}
    </group>
  );
}

// Separate component for texture loading to use Suspense
function CarImage({ sprite, rotation }: { sprite: string, rotation: number }) {
  const texture = useTexture(sprite);
  // rotation is in degrees, mesh rotation expects radians.
  // also, the billboard faces the camera, so rotating on Z axis rotates the image on screen.
  const radians = -rotation * (Math.PI / 180);
  const scale = rotation % 180 !== 0 ? 1.5 : 1;
  return (
    <mesh rotation={[0, 0, radians]} scale={[scale, scale, 1]}>
      <planeGeometry args={[3, 3]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.1} />
    </mesh>
  );
}

function MobileControls() {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    setActive(true);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!active && e.type !== 'pointerdown') return;
    if (!joystickRef.current || !knobRef.current) return;

    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const maxDistance = rect.width / 2 - 20; // 20 is half knob width

    let dx = e.clientX - centerX;
    let dy = e.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxDistance) {
      dx = (dx / distance) * maxDistance;
      dy = (dy / distance) * maxDistance;
    }

    knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;

    // Normalize -1 to 1
    const nx = dx / maxDistance;
    const ny = dy / maxDistance;

    // Deadzone
    const deadzone = 0.2;
    moveState.forward = ny < -deadzone;
    moveState.backward = ny > deadzone;
    moveState.left = nx < -deadzone;
    moveState.right = nx > deadzone;
  };

  const handlePointerUp = () => {
    setActive(false);
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(0px, 0px)`;
    }
    moveState.forward = false;
    moveState.backward = false;
    moveState.left = false;
    moveState.right = false;
  };

  return (
    <div className="absolute bottom-10 right-10 z-[100] pointer-events-auto sm:hidden">
      <div 
        ref={joystickRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-32 h-32 rounded-full bg-black/20 border-2 border-white/30 backdrop-blur-md flex items-center justify-center relative touch-none shadow-2xl"
        style={{ touchAction: 'none' }}
      >
        <div 
          ref={knobRef}
          className="w-16 h-16 rounded-full bg-white/50 backdrop-blur-lg shadow-inner absolute pointer-events-none transition-transform duration-75"
        />
      </div>
    </div>
  );
}

export function Garage3D({ onPlatformClick }: { onPlatformClick: (index: number) => void }) {
  const { cars, garageSlots } = useGame();

  return (
    <div className="absolute inset-0 bg-sky-200">
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 60 }}>
        <color attach="background" args={['#87CEEB']} />
        <fog attach="fog" args={['#87CEEB', 20, 100]} />
        <ambientLight intensity={1.5} color="#ffffff" />
        <directionalLight 
          castShadow 
          position={[20, 50, -20]} 
          intensity={3} 
          color="#ffedd5"
          shadow-mapSize-width={2048} 
          shadow-mapSize-height={2048} 
          shadow-bias={-0.0001}
        />
        <pointLight position={[0, 15, 0]} intensity={1} distance={50} decay={2} />
        
        <Environment preset="city" />

        {/* Modern Garage Environment */}
        <group>
          {/* Floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial 
               color="#09090b" 
               metalness={0.6} 
               roughness={0.2} 
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
            <gridHelper args={[100, 50, '#27272a', '#18181b']} rotation={[Math.PI / 2, 0, 0]} />
          </mesh>

          {/* Back Wall (Glass) */}
          <mesh position={[0, 10, -25]} receiveShadow>
             <boxGeometry args={[100, 20, 0.5]} />
             <meshPhysicalMaterial color="#ffffff" transmission={0.95} opacity={1} transparent metalness={0.2} roughness={0.1} ior={1.5} envMapIntensity={2} />
          </mesh>
          <mesh position={[0, 10, -25]}>
             <gridHelper args={[100, 10, '#1e293b', '#1e293b']} rotation={[Math.PI / 2, 0, 0]} />
          </mesh>
          
          {/* Left Wall (Glass) */}
          <mesh position={[-25, 10, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
             <boxGeometry args={[100, 20, 0.5]} />
             <meshPhysicalMaterial color="#ffffff" transmission={0.95} opacity={1} transparent metalness={0.2} roughness={0.1} ior={1.5} envMapIntensity={2} />
          </mesh>
          <mesh position={[-25, 10, 0]} rotation={[0, Math.PI / 2, 0]}>
             <gridHelper args={[100, 10, '#1e293b', '#1e293b']} rotation={[Math.PI / 2, 0, 0]} />
          </mesh>

          {/* Right Wall (Glass) */}
          <mesh position={[25, 10, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
             <boxGeometry args={[100, 20, 0.5]} />
             <meshPhysicalMaterial color="#ffffff" transmission={0.95} opacity={1} transparent metalness={0.2} roughness={0.1} ior={1.5} envMapIntensity={2} />
          </mesh>
          <mesh position={[25, 10, 0]} rotation={[0, -Math.PI / 2, 0]}>
             <gridHelper args={[100, 10, '#1e293b', '#1e293b']} rotation={[Math.PI / 2, 0, 0]} />
          </mesh>

          {/* Outside Environment (Road & Trees) */}
          <group position={[0, -0.5, -40]}>
            {/* Road */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
              <planeGeometry args={[200, 20]} />
              <meshStandardMaterial color="#1f2937" roughness={0.9} metalness={0.1} />
            </mesh>
            {/* Road line */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
              <planeGeometry args={[200, 0.5]} />
              <meshStandardMaterial color="#fbbf24" roughness={0.5} />
            </mesh>
            {/* Trees */}
            {[-60, -40, -20, 20, 40, 60].map((x, i) => (
              <group key={i} position={[x, 0, -10]}>
                <mesh position={[0, 4, 0]} castShadow>
                  <cylinderGeometry args={[0.5, 1, 8]} />
                  <meshStandardMaterial color="#451a03" />
                </mesh>
                <mesh position={[0, 12, 0]} castShadow>
                  <coneGeometry args={[6, 16, 8]} />
                  <meshStandardMaterial color="#14532d" roughness={0.8} />
                </mesh>
              </group>
            ))}
          </group>

          {/* Garage Interior Props */}
          {/* Neon Sign */}
          <group position={[0, 15, -24.5]}>
            <mesh>
              <boxGeometry args={[10, 2, 0.2]} />
              <meshStandardMaterial color="#111" />
            </mesh>
            <pointLight position={[0, 0, 1]} intensity={5} color="#3b82f6" distance={15} />
            <Text position={[0, 0, 0.2]} fontSize={1.5} color="#3b82f6" anchorX="center" anchorY="middle">
              CAR DEX
            </Text>
          </group>

          {/* Toolbox */}
          <group position={[20, 0, -20]} castShadow>
            <mesh position={[0, 2, 0]} castShadow>
              <boxGeometry args={[4, 4, 2]} />
              <meshStandardMaterial color="#dc2626" metalness={0.4} roughness={0.2} />
            </mesh>
            <mesh position={[0, 4.25, 0]} castShadow>
              <boxGeometry args={[4.2, 0.5, 2.2]} />
              <meshStandardMaterial color="#b91c1c" metalness={0.4} roughness={0.2} />
            </mesh>
          </group>

          {/* Front Wall with Large Open Garage Door */}
          <mesh position={[-30, 10, 25]} rotation={[0, Math.PI, 0]} receiveShadow>
             <boxGeometry args={[40, 20, 1]} />
             <meshStandardMaterial color="#0f172a" metalness={0.3} roughness={0.8} />
          </mesh>
          <mesh position={[30, 10, 25]} rotation={[0, Math.PI, 0]} receiveShadow>
             <boxGeometry args={[40, 20, 1]} />
             <meshStandardMaterial color="#0f172a" metalness={0.3} roughness={0.8} />
          </mesh>
          <mesh position={[0, 18, 25]} rotation={[0, Math.PI, 0]} receiveShadow>
             <boxGeometry args={[20, 4, 1]} />
             <meshStandardMaterial color="#0f172a" metalness={0.3} roughness={0.8} />
          </mesh>
          {/* Raised Garage Door */}
          <mesh position={[0, 19, 15]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
             <boxGeometry args={[20, 18, 0.5]} />
             <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.5} />
          </mesh>
          
          {/* Architectural Showroom Roof */}
          <group position={[0, 20, 0]}>
             {/* Main ceiling base */}
             <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#f8fafc" metalness={0.1} roughness={0.8} />
             </mesh>
             {/* Modern Skylights and Steel Trusses */}
             {[-30, -15, 0, 15, 30].map(x => (
               <group key={`skylight-${x}`} position={[x, -0.5, 0]}>
                 <mesh position={[0, 0, 0]} rotation={[Math.PI/2, 0, 0]}>
                   <boxGeometry args={[10, 90, 1]} />
                   <meshPhysicalMaterial color="#ffffff" transmission={0.9} opacity={1} transparent roughness={0} ior={1.5} />
                 </mesh>
                 <mesh position={[-5, -0.5, 0]}>
                   <boxGeometry args={[0.5, 1, 90]} />
                   <meshStandardMaterial color="#0f172a" metalness={0.8} />
                 </mesh>
                 <mesh position={[5, -0.5, 0]}>
                   <boxGeometry args={[0.5, 1, 90]} />
                   <meshStandardMaterial color="#0f172a" metalness={0.8} />
                 </mesh>
                 {[-40, -20, 0, 20, 40].map(z => (
                   <mesh key={`cross-${z}`} position={[0, -0.5, z]}>
                     <boxGeometry args={[10, 1, 0.5]} />
                     <meshStandardMaterial color="#0f172a" metalness={0.8} />
                   </mesh>
                 ))}
               </group>
             ))}
          </group>
          
          {/* Scenery Outside */}
          <group position={[0, 0, 60]}>
            {/* Road */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, -20]} receiveShadow>
               <planeGeometry args={[100, 20]} />
               <meshStandardMaterial color="#111111" roughness={0.9} />
            </mesh>
            {/* Road Lines */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, -20]}>
               <planeGeometry args={[100, 0.5]} />
               <meshStandardMaterial color="#eab308" />
            </mesh>
            {/* Grass */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
               <planeGeometry args={[200, 100]} />
               <meshStandardMaterial color="#064e3b" roughness={1} />
            </mesh>
            
            {/* Simple Trees */}
            {[-40, -30, -20, 20, 30, 40].map((x, i) => (
               <group key={`tree-${i}`} position={[x, 0, 5 + Math.random() * 10]}>
                  <mesh position={[0, 2, 0]} castShadow>
                     <cylinderGeometry args={[0.5, 0.8, 4]} />
                     <meshStandardMaterial color="#451a03" roughness={0.9} />
                  </mesh>
                  <mesh position={[0, 6, 0]} castShadow>
                     <coneGeometry args={[4, 10, 8]} />
                     <meshStandardMaterial color="#065f46" roughness={0.8} />
                  </mesh>
               </group>
            ))}
          </group>
          
          {/* Modern Neon Strips on Walls */}
          <mesh position={[0, 15, -24.4]}>
             <boxGeometry args={[40, 0.5, 0.1]} />
             <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={2} toneMapped={false} />
          </mesh>
          <mesh position={[-24.4, 15, 0]} rotation={[0, Math.PI / 2, 0]}>
             <boxGeometry args={[40, 0.5, 0.1]} />
             <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={2} toneMapped={false} />
          </mesh>
          <mesh position={[24.4, 15, 0]} rotation={[0, Math.PI / 2, 0]}>
             <boxGeometry args={[40, 0.5, 0.1]} />
             <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        </group>
        
        <Player />
        
        <OrbitControls 
          makeDefault 
          enablePan={false} 
          enableZoom={true} 
          minDistance={3} 
          maxDistance={30} 
          maxPolarAngle={Math.PI / 2 + 0.1}
          enableDamping={true}
          dampingFactor={0.05}
          rotateSpeed={0.7}
        />

        {/* Render cars on platforms in a grid or circle */}
        {React.Suspense && (
          <React.Suspense fallback={null}>
            {garageSlots.map((carId, i) => {
              const car = carId ? cars.find(c => c.id === carId) || null : null;
              // Calculate position in a grid
              const cols = 3;
              const spacing = 8;
              const x = (i % cols - 1) * spacing;
              const z = -Math.floor(i / cols) * spacing - 10;
              
              return <CarPlatform key={`slot-${i}`} car={car} position={[x, 0, z]} onClick={() => onPlatformClick(i)} />;
            })}
          </React.Suspense>
        )}
      </Canvas>
      <MobileControls />
    </div>
  );
}
