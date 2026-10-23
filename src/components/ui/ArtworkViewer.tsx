import { useEffect, useState } from "react";
import type { Artwork } from "../../types";

export function ArtworkViewer({ artwork, onClose }: { artwork: Artwork | null; onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setZoomed(false);
    if (!artwork) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [artwork, onClose]);

  if (!artwork) return null;

  return (
    <div className="viewer">
      <button className="viewer__backdrop" onClick={onClose} aria-label="Close viewer" />
      <button className="button button--ghost viewer__close" onClick={onClose}>
        Close
      </button>
      <div className="viewer__frame">
        <div className="viewer__image-wrap" onClick={() => setZoomed((value) => !value)}>
          <img
            className={`viewer__image ${zoomed ? "viewer__image--zoomed" : ""}`}
            src={artwork.fullUrl}
            alt={artwork.title}
            loading="eager"
            decoding="async"
          />
        </div>
        <div className="viewer__info">
          <p className="viewer__eyebrow">On view</p>
          <h1 className="viewer__title">{artwork.title}</h1>
          {artwork.artist && <p className="viewer__artist">{artwork.artist}</p>}
          <p className="viewer__body">{artwork.description}</p>
          <div className="viewer__actions">
            <button className="button button--ghost" onClick={() => setZoomed((value) => !value)}>
              {zoomed ? "Exit detail" : "Zoom in"}
            </button>
            <button className="button button--ghost" onClick={onClose}>
              Return to gallery
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
