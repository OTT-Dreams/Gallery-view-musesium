import { useEffect, useState } from "react";
import type { HallLayout } from "../../lib/layout";
import type { ControlsApi } from "../../types";
import "../../minimap.css";

function getApi(): ControlsApi | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { __ATELIER_CONTROLS__?: ControlsApi }).__ATELIER_CONTROLS__ || null;
}

export function Minimap({ layout }: { layout: HallLayout }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const position = getApi()?.getPosition();
      if (!position) return;
      const room = layout.roomAt(position.x, position.z);
      setCurrent((previous) => (previous === room.index ? previous : room.index));
    }, 200);
    return () => window.clearInterval(timer);
  }, [layout]);

  function goTo(index: number) {
    const room = layout.rooms[index];
    getApi()?.teleport(room.x, room.z + 4.5, 0);
    setCurrent(index);
    setOpen(false);
  }

  return (
    <div className="minimap">
      <button type="button" className="minimap__toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        Room {current + 1} / {layout.rooms.length} · {open ? "Hide map" : "Map"}
      </button>
      {open && (
        <div className="minimap__panel">
          <div className="minimap__grid" style={{ gridTemplateColumns: `repeat(${layout.cols}, 26px)` }}>
            {layout.rooms.map((room) => (
              <button
                key={room.index}
                type="button"
                className={`minimap__room${room.index === current ? " minimap__room--here" : ""}`}
                onClick={() => goTo(room.index)}
                title={`Room ${room.index + 1} (${room.artworks.length} works)`}
              >
                {room.index + 1}
              </button>
            ))}
          </div>
          <p className="minimap__hint">Click a room to go there.</p>
        </div>
      )}
    </div>
  );
}
