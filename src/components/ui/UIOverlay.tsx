import { MobileControls } from "./MobileControls";
import { Minimap } from "./Minimap";
import type { HallLayout } from "../../lib/layout";
import { useIsTouchDevice } from "../../hooks/useMediaQuery";

export function UIOverlay({ count, layout }: { count: number; layout: HallLayout | null }) {
  const isTouch = useIsTouchDevice();

  return (
    <>
      <div className="hud">
        <div className="hud__top">
          <div className="hud__brand">
            <p className="hud__eyebrow">Atelier</p>
            <h2 className="hud__title">Virtual Museum</h2>
          </div>
          <div className="hud__meta">
            <p className="hud__text">
              {count} {count === 1 ? "work" : "works"} on view
            </p>
          </div>
        </div>
        <div className="hud__bottom">
          <div className="hud__help">
            <div className="hud__keys">
              <div className="hud__key">
                <span className="hud__key-dot" />
                <span>W A S D to walk · Shift to run · ← → to turn</span>
              </div>
              <div className="hud__key">
                <span className="hud__key-dot" />
                <span>Drag to look · Click artwork to view</span>
              </div>
              <div className="hud__key">
                <span className="hud__key-dot" />
                <span>ESC / close to return to gallery</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {layout && <Minimap layout={layout} />}
      {isTouch && <MobileControls />}
    </>
  );
}
