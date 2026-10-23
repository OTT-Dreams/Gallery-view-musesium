import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { HallLayout } from "../../lib/layout";
import type { ControlsApi } from "../../types";

const MAX_SPEED = 3.4; // units per second
const SPRINT_FACTOR = 2.6; // hold Shift to run
const TURN_SPEED = 1.8; // radians per second (arrow left / right)
const ACCELERATION = 10;
const MOUSE_SENSITIVITY = 0.0026;
const PITCH_LIMIT = 1.15;
const EYE_HEIGHT = 1.72;
const HANDLED_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ShiftLeft",
  "ShiftRight"
]);

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function FirstPersonControls({ paused, layout }: { paused: boolean; layout: HallLayout }) {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const pausedRef = useRef(paused);
  const position = useRef({ x: layout.start.x, z: layout.start.z });
  const velocity = useRef({ right: 0, forward: 0 });
  const rotation = useRef({ yaw: layout.start.yaw, pitch: 0 });
  const moveInput = useRef({ x: 0, y: 0 });

  useEffect(() => {
    pausedRef.current = paused;
    if (paused) {
      keys.current = {};
      moveInput.current = { x: 0, y: 0 };
    }
  }, [paused]);

  useEffect(() => {
    camera.rotation.order = "YXZ";

    const look = (deltaX: number, deltaY: number) => {
      if (pausedRef.current) return;
      rotation.current.yaw -= deltaX;
      rotation.current.pitch = clamp(rotation.current.pitch - deltaY, -PITCH_LIMIT, PITCH_LIMIT);
    };

    const api: ControlsApi = {
      setMove: (x, y) => {
        moveInput.current = { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
      },
      look,
      teleport: (x, z, yaw = 0) => {
        position.current = { x, z };
        rotation.current = { yaw, pitch: 0 };
        velocity.current = { right: 0, forward: 0 };
      },
      getPosition: () => ({ x: position.current.x, z: position.current.z, yaw: rotation.current.yaw })
    };
    (window as unknown as { __ATELIER_CONTROLS__?: ControlsApi }).__ATELIER_CONTROLS__ = api;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!HANDLED_KEYS.has(event.code) || pausedRef.current) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      event.preventDefault();
      keys.current[event.code] = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keys.current[event.code] = false;
    };
    const releaseAll = () => {
      keys.current = {};
    };

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const element = gl.domElement;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch" || event.button !== 0) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      element.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      look((event.clientX - lastX) * MOUSE_SENSITIVITY, (event.clientY - lastY) * MOUSE_SENSITIVITY);
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseAll);
    document.addEventListener("visibilitychange", releaseAll);
    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerUp);
    element.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseAll);
      document.removeEventListener("visibilitychange", releaseAll);
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerUp);
      delete (window as unknown as { __ATELIER_CONTROLS__?: ControlsApi }).__ATELIER_CONTROLS__;
    };
  }, [camera, gl]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const k = keys.current;
    const rot = rotation.current;

    const turn = (k["ArrowLeft"] ? 1 : 0) - (k["ArrowRight"] ? 1 : 0);
    rot.yaw += turn * TURN_SPEED * delta;

    let forward = (k["KeyW"] || k["ArrowUp"] ? 1 : 0) - (k["KeyS"] || k["ArrowDown"] ? 1 : 0);
    let strafe = (k["KeyD"] ? 1 : 0) - (k["KeyA"] ? 1 : 0);
    forward += moveInput.current.y;
    strafe += moveInput.current.x;

    const length = Math.hypot(forward, strafe);
    if (length > 1) {
      forward /= length;
      strafe /= length;
    }

    const speed = k["ShiftLeft"] || k["ShiftRight"] ? MAX_SPEED * SPRINT_FACTOR : MAX_SPEED;
    const ease = 1 - Math.exp(-ACCELERATION * delta);
    const vel = velocity.current;
    vel.forward += (forward * speed - vel.forward) * ease;
    vel.right += (strafe * speed - vel.right) * ease;

    const sin = Math.sin(rot.yaw);
    const cos = Math.cos(rot.yaw);
    const dx = (cos * vel.right - sin * vel.forward) * delta;
    const dz = (-sin * vel.right - cos * vel.forward) * delta;

    const pos = position.current;
    if (layout.isWalkable(pos.x + dx, pos.z)) pos.x += dx;
    if (layout.isWalkable(pos.x, pos.z + dz)) pos.z += dz;

    camera.position.set(pos.x, EYE_HEIGHT, pos.z);
    camera.rotation.set(rot.pitch, rot.yaw, 0, "YXZ");
  });

  return null;
}
