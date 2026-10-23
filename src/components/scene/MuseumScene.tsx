import { useMemo, useRef, useState } from "react";
import { Environment, Lightformer } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { RoomView } from "./GalleryGeometry";
import { ArtworkFrame } from "./ArtworkFrame";
import { FirstPersonControls } from "./FirstPersonControls";
import type { HallLayout } from "../../lib/layout";
import type { Artwork } from "../../types";

type MuseumSceneProps = {
  artworks: Artwork[];
  layout: HallLayout;
  onViewArtwork: (artwork: Artwork) => void;
  paused: boolean;
};

/** A warm light that walks with the visitor, so nearby walls and floor are always lit. */
function VisitorLight() {
  const light = useRef<THREE.PointLight>(null);
  const { camera } = useThree();
  useFrame(() => {
    light.current?.position.set(camera.position.x, 3.4, camera.position.z);
  });
  return <pointLight ref={light} color="#ffe6c2" intensity={14} distance={16} decay={1.6} />;
}

/** Reports which room the visitor is in, so only the rooms around them are drawn. */
function RoomTracker({ layout, onRoom }: { layout: HallLayout; onRoom: (index: number) => void }) {
  const { camera } = useThree();
  const current = useRef(-1);
  useFrame(() => {
    const room = layout.roomAt(camera.position.x, camera.position.z);
    if (room.index !== current.current) {
      current.current = room.index;
      onRoom(room.index);
    }
  });
  return null;
}

export function MuseumScene({ artworks, layout, onViewArtwork, paused }: MuseumSceneProps) {
  const [currentRoom, setCurrentRoom] = useState(0);
  const visibleRooms = useMemo(() => layout.visibleRooms(currentRoom), [layout, currentRoom]);

  return (
    <>
      <color attach="background" args={["#d8d2c6"]} />
      <fog attach="fog" args={["#d8d2c6", 20, 70]} />

      <hemisphereLight args={["#fff3e0", "#b8a98f", 0.7]} />
      <ambientLight intensity={0.35} />
      <VisitorLight />

      {/* Procedural reflections, no files are downloaded */}
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[12, 24, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[24, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[6, 2, 0]} rotation-y={-Math.PI / 2} scale={[24, 4, 1]} />
      </Environment>

      <RoomTracker layout={layout} onRoom={setCurrentRoom} />

      {visibleRooms.map((room) => (
        <group key={room.index}>
          <RoomView room={room} reflective={room.index === currentRoom} />
          {room.artworks.map((artworkIndex) => (
            <ArtworkFrame
              key={artworks[artworkIndex].id}
              artwork={artworks[artworkIndex]}
              position={layout.placements[artworkIndex].position}
              rotation={layout.placements[artworkIndex].rotation}
              onView={onViewArtwork}
            />
          ))}
        </group>
      ))}

      <FirstPersonControls paused={paused} layout={layout} />

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.15} luminanceThreshold={0.9} luminanceSmoothing={0.2} />
        <Vignette eskil={false} offset={0.3} darkness={0.3} />
      </EffectComposer>
    </>
  );
}
