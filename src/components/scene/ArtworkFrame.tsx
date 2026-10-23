import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Artwork } from "../../types";
import { EYE_LEVEL, HEIGHT } from "../../lib/layout";
import { getGlowTexture, getShadowTexture, makePlaqueTexture } from "../../lib/textures";

type ArtworkFrameProps = {
  artwork: Artwork;
  position: [number, number, number];
  rotation: [number, number, number];
  onView: (artwork: Artwork) => void;
};

const LOAD_DISTANCE = 24; // start loading the image when the visitor is this close
const UNLOAD_DISTANCE = 46; // free the image again when the visitor walks away
const MAX_WIDTH = 2.8;
const MAX_HEIGHT = 2.0;
const MAT = 0.14;
const FRAME = 0.07;
const noRaycast = () => {};

export function ArtworkFrame({ artwork, position, rotation, onView }: ArtworkFrameProps) {
  const { camera, gl } = useThree();
  const [near, setNear] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [aspect, setAspect] = useState(() => artwork.width / Math.max(1, artwork.height));
  const [hovered, setHovered] = useState(false);
  const countdown = useRef(Math.random() * 0.3);
  const worldPosition = useMemo(() => new THREE.Vector3(...position), [position]);

  useFrame((_, delta) => {
    countdown.current -= delta;
    if (countdown.current > 0) return;
    countdown.current = 0.3;
    const distance = camera.position.distanceTo(worldPosition);
    if (!near && distance < LOAD_DISTANCE) setNear(true);
    else if (near && distance > UNLOAD_DISTANCE) setNear(false);
  });

  useEffect(() => {
    if (!near) return;
    let cancelled = false;
    let loaded: THREE.Texture | null = null;

    new THREE.TextureLoader().load(
      artwork.thumbUrl,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
        loaded = tex;
        const image = tex.image as { width?: number; height?: number } | undefined;
        if (image?.width && image?.height) setAspect(image.width / image.height);
        setTexture(tex);
      },
      undefined,
      () => {
        /* keep the grey placeholder if the image fails */
      }
    );

    return () => {
      cancelled = true;
      loaded?.dispose();
      setTexture(null);
    };
  }, [near, artwork.thumbUrl, gl]);

  const plaque = useMemo(
    () => (near ? makePlaqueTexture(artwork.title, artwork.artist) : null),
    [near, artwork.title, artwork.artist]
  );
  useEffect(() => () => plaque?.dispose(), [plaque]);

  const imageWidth = Math.min(MAX_WIDTH, MAX_HEIGHT * aspect);
  const imageHeight = imageWidth / aspect;
  const matWidth = imageWidth + MAT * 2;
  const matHeight = imageHeight + MAT * 2;
  const outerWidth = matWidth + FRAME * 2;
  const outerHeight = matHeight + FRAME * 2;

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.delta > 6) return; // the pointer was dragged to look around, not a click
    onView(artwork);
  };

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      {/* Drop shadow on the wall */}
      <mesh position={[0.05, -0.08, -0.057]} raycast={noRaycast} renderOrder={1}>
        <planeGeometry args={[outerWidth + 0.8, outerHeight + 0.8]} />
        <meshBasicMaterial map={getShadowTexture()} transparent opacity={0.5} depthWrite={false} />
      </mesh>

      {/* Light pool on the wall */}
      <mesh position={[0, 0.1, -0.055]} raycast={noRaycast} renderOrder={2}>
        <planeGeometry args={[outerWidth + 3.4, outerHeight + 2.8]} />
        <meshBasicMaterial
          map={getGlowTexture()}
          color="#ffe0a8"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Pool of light on the floor below the artwork */}
      <mesh position={[0, 0.02 - EYE_LEVEL, 1.2]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast} renderOrder={2}>
        <planeGeometry args={[outerWidth + 1, 2.4]} />
        <meshBasicMaterial
          map={getGlowTexture()}
          color="#ffe0a8"
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Track light on the ceiling, aimed at the artwork */}
      <mesh position={[0, HEIGHT - EYE_LEVEL - 0.1, 1.1]} rotation={[0.45, 0, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[0.07, 0.09, 0.22, 12]} />
        <meshStandardMaterial color="#1b1b1d" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Frame */}
      <mesh position={[0, 0, -0.005]}>
        <boxGeometry args={[outerWidth, outerHeight, 0.09]} />
        <meshStandardMaterial color={hovered ? "#6a4a30" : "#3a281b"} roughness={0.45} metalness={0.1} />
      </mesh>

      {/* Mat */}
      <mesh position={[0, 0, 0.0415]}>
        <planeGeometry args={[matWidth, matHeight]} />
        <meshStandardMaterial color="#f1ece1" roughness={0.95} />
      </mesh>

      {/* Image */}
      <mesh position={[0, 0, 0.043]}>
        <planeGeometry args={[imageWidth, imageHeight]} />
        {texture ? (
          <meshBasicMaterial key="image" map={texture} toneMapped={false} />
        ) : (
          <meshBasicMaterial key="placeholder" color="#b9b2a4" toneMapped={false} />
        )}
      </mesh>

      {/* Label beside the frame */}
      {plaque && (
        <mesh position={[outerWidth / 2 + 0.55, -0.3, -0.045]} raycast={noRaycast}>
          <planeGeometry args={[0.8, 0.4]} />
          <meshStandardMaterial key="plaque" map={plaque} roughness={0.7} />
        </mesh>
      )}
    </group>
  );
}
