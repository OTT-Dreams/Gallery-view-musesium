import { useMemo } from "react";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useIsTouchDevice } from "../../hooks/useMediaQuery";
import { getEdgeShadowTexture, makeFloorTexture, makePlasterTexture, makeTitleTexture } from "../../lib/textures";
import { DOOR_H, DOOR_W, HEIGHT, ROOM_SIZE, WALLS, WALL_T, type Room, type Wall } from "../../lib/layout";

const WOOD = "#3a281b";
const noRaycast = () => {};
const half = ROOM_SIZE / 2;

// Textures shared by every room.
const floorTextures: Array<THREE.CanvasTexture | undefined> = [];
function getFloorTexture(kind: 0 | 1 | 2): THREE.CanvasTexture {
  let texture = floorTextures[kind];
  if (!texture) {
    texture = makeFloorTexture(kind);
    texture.repeat.set(ROOM_SIZE / 2.4, ROOM_SIZE / 2.4);
    floorTextures[kind] = texture;
  }
  return texture;
}

let plasterTexture: THREE.CanvasTexture | null = null;
function getPlasterTexture(): THREE.CanvasTexture {
  if (!plasterTexture) {
    plasterTexture = makePlasterTexture();
    plasterTexture.repeat.set(6, 2);
  }
  return plasterTexture;
}

let titleTexture: THREE.CanvasTexture | null = null;
function getTitleTexture(): THREE.CanvasTexture {
  if (!titleTexture) titleTexture = makeTitleTexture();
  return titleTexture;
}

type Segment = { center: number; width: number };

/** Parts of a wall that are solid, in wall-local x. A wall with a door is split around the opening. */
function solidSegments(hasDoor: boolean): Segment[] {
  if (!hasDoor) return [{ center: 0, width: ROOM_SIZE }];
  const width = (ROOM_SIZE - DOOR_W) / 2;
  const center = (ROOM_SIZE + DOOR_W) / 4;
  return [
    { center: -center, width },
    { center, width }
  ];
}

/** Position and rotation of a wall's local frame. Local +x runs left to right when facing the wall. */
function wallFrame(room: Room, wall: Wall): { position: [number, number, number]; rotation: [number, number, number] } {
  switch (wall) {
    case "N":
      return { position: [room.x, 0, room.z - half], rotation: [0, 0, 0] };
    case "E":
      return { position: [room.x + half, 0, room.z], rotation: [0, -Math.PI / 2, 0] };
    case "S":
      return { position: [room.x, 0, room.z + half], rotation: [0, Math.PI, 0] };
    default:
      return { position: [room.x - half, 0, room.z], rotation: [0, Math.PI / 2, 0] };
  }
}

function WallView({ room, wall }: { room: Room; wall: Wall }) {
  const door = room.doors[wall];
  const segments = solidSegments(Boolean(door));
  const frame = wallFrame(room, wall);
  const wallMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: room.wallColor,
        roughness: 0.92,
        bumpMap: getPlasterTexture(),
        bumpScale: 0.6
      }),
    [room.wallColor]
  );

  return (
    <group position={frame.position} rotation={frame.rotation}>
      {segments.map((segment) => (
        <group key={segment.center} position={[segment.center, 0, 0]}>
          {/* Wall */}
          <mesh position={[0, HEIGHT / 2, 0]} material={wallMaterial}>
            <planeGeometry args={[segment.width, HEIGHT]} />
          </mesh>
          {/* Baseboard */}
          <mesh position={[0, 0.09, 0.02]}>
            <boxGeometry args={[segment.width, 0.18, 0.04]} />
            <meshStandardMaterial color={WOOD} roughness={0.5} />
          </mesh>
          {/* Soft shadow where the wall meets the floor */}
          <mesh position={[0, 0.006, 0.5]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
            <planeGeometry args={[segment.width, 1]} />
            <meshBasicMaterial map={getEdgeShadowTexture()} transparent depthWrite={false} />
          </mesh>
        </group>
      ))}

      {/* Wall above the doorway */}
      {door && (
        <mesh position={[0, DOOR_H + (HEIGHT - DOOR_H) / 2, 0]} material={wallMaterial}>
          <planeGeometry args={[DOOR_W, HEIGHT - DOOR_H]} />
        </mesh>
      )}

      {/* Crown moulding */}
      <mesh position={[0, HEIGHT - 0.07, 0.03]}>
        <boxGeometry args={[ROOM_SIZE, 0.14, 0.06]} />
        <meshStandardMaterial color="#efeae0" roughness={0.8} />
      </mesh>

      {/* Door frame, drawn once for the two rooms that share the door */}
      {door === "owner" && (
        <group position={[0, 0, -WALL_T / 2]}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * (DOOR_W / 2 - 0.09), DOOR_H / 2, 0]}>
              <boxGeometry args={[0.26, DOOR_H, WALL_T + 0.06]} />
              <meshStandardMaterial color={WOOD} roughness={0.5} />
            </mesh>
          ))}
          <mesh position={[0, DOOR_H - 0.09, 0]}>
            <boxGeometry args={[DOOR_W + 0.08, 0.26, WALL_T + 0.06]} />
            <meshStandardMaterial color={WOOD} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.015, 0]}>
            <boxGeometry args={[DOOR_W - 0.4, 0.03, WALL_T + 0.06]} />
            <meshStandardMaterial color="#2a1c12" roughness={0.45} />
          </mesh>
        </group>
      )}

      {/* Title on the wall of the first room */}
      {room.hasTitle && wall === "N" && (
        <mesh position={[0, 2.9, 0.02]} raycast={noRaycast}>
          <planeGeometry args={[6, 2.25]} />
          <meshStandardMaterial map={getTitleTexture()} transparent roughness={0.92} />
        </mesh>
      )}
    </group>
  );
}

export function RoomView({ room, reflective }: { room: Room; reflective: boolean }) {
  const touch = useIsTouchDevice();
  const floorTexture = getFloorTexture(room.floorKind);
  const useReflector = reflective && !touch;

  return (
    <group>
      {/* Floor */}
      <mesh position={[room.x, 0, room.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        {useReflector ? (
          <MeshReflectorMaterial
            key="reflector"
            map={floorTexture}
            color="#ffffff"
            blur={[360, 100]}
            resolution={512}
            mixBlur={1}
            mixStrength={room.floorKind === 1 ? 0.3 : 0.3}
            mirror={0}
            roughness={room.floorKind === 1 ? 0.8 : 0.85}
            metalness={0.05}
            depthScale={0.6}
            minDepthThreshold={0.6}
            maxDepthThreshold={1.6}
          />
        ) : (
          <meshStandardMaterial
            key="plain"
            map={floorTexture}
            roughness={room.floorKind === 1 ? 0.55 : 0.45}
            metalness={0.05}
          />
        )}
      </mesh>

      {/* Ceiling */}
      <mesh position={[room.x, HEIGHT, room.z]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial color="#f4f0e8" emissive="#9a9486" emissiveIntensity={0.45} roughness={1} />
      </mesh>

      {/* Recessed ceiling lights */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[room.x + sx * 3.6, HEIGHT - 0.02, room.z + sz * 3.6]} raycast={noRaycast}>
            <boxGeometry args={[3, 0.04, 3]} />
            <meshStandardMaterial color="#fff4e0" emissive="#ffe9c4" emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
        ))
      )}

      {WALLS.map((wall) => (
        <WallView key={wall} room={room} wall={wall} />
      ))}

      {/* Bench in the middle of the room */}
      {room.bench && (
        <group position={[room.x, 0, room.z]}>
          <mesh position={[0, 0.46, 0]}>
            <boxGeometry args={[0.55, 0.09, 2.4]} />
            <meshStandardMaterial color="#4a3426" roughness={0.55} />
          </mesh>
          {[-1, 1].map((end) => (
            <mesh key={end} position={[0, 0.22, end * 1.0]}>
              <boxGeometry args={[0.45, 0.44, 0.08]} />
              <meshStandardMaterial color="#1c1c1e" roughness={0.4} metalness={0.4} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
