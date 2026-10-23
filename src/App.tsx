import { Suspense, useCallback, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { MuseumScene } from "./components/scene/MuseumScene";
import { UIOverlay } from "./components/ui/UIOverlay";
import { Landing } from "./components/ui/Landing";
import { ArtworkViewer } from "./components/ui/ArtworkViewer";
import { Loading } from "./components/ui/Loading";
import { getCollection } from "./lib/api";
import { buildLayout } from "./lib/layout";
import type { Artwork, Collection } from "./types";

type AppState =
  | { phase: "gate" }
  | { phase: "loading" }
  | { phase: "museum"; collection: Collection }
  | { phase: "error"; message: string };

export default function App() {
  const [state, setState] = useState<AppState>({ phase: "gate" });
  const [viewer, setViewer] = useState<Artwork | null>(null);

  const enter = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const collection = await getCollection();
      setState({ phase: "museum", collection });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to initialize museum.";
      setState({ phase: "error", message });
    }
  }, []);

  const handleViewArtwork = useCallback((artwork: Artwork) => {
    setViewer(artwork);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setViewer(null);
  }, []);

  const museum = useMemo(() => {
    if (state.phase !== "museum") return null;
    return state.collection.artworks;
  }, [state]);

  const layout = useMemo(() => (museum ? buildLayout(museum.length) : null), [museum]);

  if (state.phase === "gate") {
    return <Landing onEnter={() => void enter()} />;
  }

  if (state.phase === "loading") {
    return <Loading label="Collecting the exhibition" />;
  }

  if (state.phase === "error") {
    return (
      <div className="app-shell app-shell--center">
        <div className="panel panel--compact">
          <p className="eyebrow">Something went wrong</p>
          <h1 className="panel__title">The gallery could not be loaded</h1>
          <p className="panel__body">{state.message}</p>
          <button className="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Canvas
        shadows
        dpr={[1, 1.8]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 68, near: 0.08, far: 220, position: [0, 1.8, 12] }}
      >
        <color attach="background" args={["#0f0c09"]} />
        <Suspense fallback={null}>
          {museum && layout && (
            <MuseumScene artworks={museum} layout={layout} onViewArtwork={handleViewArtwork} paused={viewer !== null} />
          )}
        </Suspense>
      </Canvas>
      <UIOverlay count={museum?.length || 0} layout={layout} />
      <ArtworkViewer artwork={viewer} onClose={handleCloseViewer} />
    </div>
  );
}
