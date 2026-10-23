import { useEffect, useRef } from "react";
import type { ControlsApi } from "../../types";

function getApi(): ControlsApi | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { __ATELIER_CONTROLS__?: ControlsApi }).__ATELIER_CONTROLS__ || null;
}

export function MobileControls() {
  const moveRef = useRef<HTMLDivElement>(null);
  const lookRef = useRef<HTMLDivElement>(null);
  const moveState = useRef({ active: false, startX: 0, startY: 0, dx: 0, dy: 0 });
  const lookState = useRef({ active: false, lastX: 0, lastY: 0 });

  useEffect(() => {
    const move = moveRef.current;
    const look = lookRef.current;
    const api = getApi();
    if (!move || !look) return;

    const onMoveStart = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      moveState.current = { active: true, startX: touch.clientX, startY: touch.clientY, dx: 0, dy: 0 };
      event.preventDefault();
    };

    const onMoveMove = (event: TouchEvent) => {
      if (!moveState.current.active) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = (touch.clientX - moveState.current.startX) / 56;
      const dy = (touch.clientY - moveState.current.startY) / 56;
      moveState.current.dx = Math.max(-1, Math.min(1, dx));
      moveState.current.dy = Math.max(-1, Math.min(1, dy));
      const controls = getApi();
      controls?.setMove(moveState.current.dx, -moveState.current.dy);
      event.preventDefault();
    };

    const onMoveEnd = (event: TouchEvent) => {
      moveState.current = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
      getApi()?.setMove(0, 0);
      event.preventDefault();
    };

    const onLookStart = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      lookState.current = { active: true, lastX: touch.clientX, lastY: touch.clientY };
      event.preventDefault();
    };

    const onLookMove = (event: TouchEvent) => {
      if (!lookState.current.active) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const deltaX = touch.clientX - lookState.current.lastX;
      const deltaY = touch.clientY - lookState.current.lastY;
      lookState.current.lastX = touch.clientX;
      lookState.current.lastY = touch.clientY;
      getApi()?.look(deltaX * 0.0042, deltaY * 0.0036);
      event.preventDefault();
    };

    const onLookEnd = (event: TouchEvent) => {
      lookState.current.active = false;
      event.preventDefault();
    };

    move.addEventListener("touchstart", onMoveStart, { passive: false });
    move.addEventListener("touchmove", onMoveMove, { passive: false });
    move.addEventListener("touchend", onMoveEnd, { passive: false });
    move.addEventListener("touchcancel", onMoveEnd, { passive: false });
    look.addEventListener("touchstart", onLookStart, { passive: false });
    look.addEventListener("touchmove", onLookMove, { passive: false });
    look.addEventListener("touchend", onLookEnd, { passive: false });
    look.addEventListener("touchcancel", onLookEnd, { passive: false });

    const frame = setInterval(() => {
      const controls = getApi();
      if (moveState.current.active) {
        controls?.setMove(moveState.current.dx, -moveState.current.dy);
      }
    }, 16);

    void api;

    return () => {
      clearInterval(frame);
      move.removeEventListener("touchstart", onMoveStart);
      move.removeEventListener("touchmove", onMoveMove);
      move.removeEventListener("touchend", onMoveEnd);
      move.removeEventListener("touchcancel", onMoveEnd);
      look.removeEventListener("touchstart", onLookStart);
      look.removeEventListener("touchmove", onLookMove);
      look.removeEventListener("touchend", onLookEnd);
      look.removeEventListener("touchcancel", onLookEnd);
      getApi()?.setMove(0, 0);
    };
  }, []);

  return (
    <>
      <div className="joystick" ref={moveRef}>
        <div className="joystick__base">
          <div className="joystick__knob" />
        </div>
        <span className="joystick__label">Move</span>
      </div>
      <div className="look-pad" ref={lookRef}>
        <span className="joystick__label" style={{ position: "absolute", bottom: -26, left: "50%", transform: "translateX(-50%)" }}>
          Look
        </span>
      </div>
    </>
  );
}
