import * as THREE from "three";

// All textures are drawn on canvases, so nothing is downloaded and the CSP stays strict.

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  return { canvas, ctx };
}

function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function finish(canvas: HTMLCanvasElement, color: boolean, repeat = false): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  }
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/** Floor texture. kind 0 = oak planks, 1 = stone tiles, 2 = dark walnut planks. One tile covers about 2.4 m x 2.4 m. */
export function makeFloorTexture(kind: 0 | 1 | 2 = 0): THREE.CanvasTexture {
  const size = 1024;
  const { canvas, ctx } = createCanvas(size, size);
  const rnd = seeded(11 + kind * 7);

  if (kind === 1) {
    ctx.fillStyle = "#524f49";
    ctx.fillRect(0, 0, size, size);
    const tiles = 4;
    const tile = size / tiles;
    for (let row = 0; row < tiles; row += 1) {
      for (let col = 0; col < tiles; col += 1) {
        const light = (row + col) % 2 === 0;
        const k = 0.94 + rnd() * 0.1;
        const base = light ? [150, 146, 138] : [120, 116, 110];
        ctx.fillStyle = `rgb(${(base[0] * k) | 0},${(base[1] * k) | 0},${(base[2] * k) | 0})`;
        ctx.fillRect(col * tile + 3, row * tile + 3, tile - 6, tile - 6);
        ctx.strokeStyle = "rgba(110,106,98,0.28)";
        ctx.lineWidth = 1.5;
        for (let vein = 0; vein < 3; vein += 1) {
          ctx.beginPath();
          const sx = col * tile + rnd() * tile;
          const sy = row * tile + rnd() * tile;
          ctx.moveTo(sx, sy);
          ctx.bezierCurveTo(sx + 60 * (rnd() - 0.5), sy + 90, sx + 90 * (rnd() - 0.5), sy + 160, sx + 50 * (rnd() - 0.5), sy + 250);
          ctx.stroke();
        }
      }
    }
    return finish(canvas, true, true);
  }

  const base = kind === 2 ? [88, 60, 42] : [132, 98, 68];
  ctx.fillStyle = kind === 2 ? "#3c2a1d" : "#5a4330";
  ctx.fillRect(0, 0, size, size);

  const rows = 12;
  const rowHeight = size / rows;
  for (let row = 0; row < rows; row += 1) {
    let x = -rnd() * size * 0.5;
    while (x < size) {
      const length = size * (0.36 + rnd() * 0.32);
      const k = 0.82 + rnd() * 0.32;
      ctx.fillStyle = `rgb(${(base[0] * k) | 0},${(base[1] * k) | 0},${(base[2] * k) | 0})`;
      ctx.fillRect(x, row * rowHeight, length, rowHeight);

      ctx.strokeStyle = "rgba(40,24,12,0.16)";
      ctx.lineWidth = 1;
      for (let grain = 0; grain < 6; grain += 1) {
        const y = row * rowHeight + rnd() * rowHeight;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + length * 0.3, y + (rnd() - 0.5) * 5, x + length * 0.65, y + (rnd() - 0.5) * 5, x + length, y);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(24,14,8,0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, row * rowHeight, length, rowHeight);
      x += length;
    }
  }
  return finish(canvas, true, true);
}

let edgeShadowTexture: THREE.CanvasTexture | null = null;
/** Dark fade along the bottom of a wall, so the floor does not look pasted on. */
export function getEdgeShadowTexture(): THREE.CanvasTexture {
  if (edgeShadowTexture) return edgeShadowTexture;
  const { canvas, ctx } = createCanvas(16, 128);
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, "rgba(0,0,0,0.38)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 16, 128);
  edgeShadowTexture = finish(canvas, true);
  return edgeShadowTexture;
}

/** Fine plaster noise used as a bump map on the walls. */
export function makePlasterTexture(): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = createCanvas(size, size);
  const rnd = seeded(23);
  const image = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i += 1) {
    const value = 118 + rnd() * 22;
    image.data[i * 4] = value;
    image.data[i * 4 + 1] = value;
    image.data[i * 4 + 2] = value;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return finish(canvas, false, true);
}

let glowTexture: THREE.CanvasTexture | null = null;
/** Soft warm pool of light behind an artwork. */
export function getGlowTexture(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture;
  const { canvas, ctx } = createCanvas(256, 256);
  const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.55, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  glowTexture = finish(canvas, true);
  return glowTexture;
}

let shadowTexture: THREE.CanvasTexture | null = null;
/** Soft drop shadow behind a frame. */
export function getShadowTexture(): THREE.CanvasTexture {
  if (shadowTexture) return shadowTexture;
  const { canvas, ctx } = createCanvas(128, 128);
  const gradient = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,0.9)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  shadowTexture = finish(canvas, true);
  return shadowTexture;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s+\S*$/, "")}...`;
    return kept;
  }
  return lines;
}

/** Museum label with the title and artist. */
export function makePlaqueTexture(title: string, artist?: string): THREE.CanvasTexture {
  const { canvas, ctx } = createCanvas(512, 256);
  ctx.fillStyle = "#f0ebe0";
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = "rgba(60,50,40,0.35)";
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 492, 236);

  ctx.fillStyle = "#1d1a16";
  ctx.textBaseline = "alphabetic";
  ctx.font = "600 40px Georgia, 'Times New Roman', serif";
  const lines = wrapLines(ctx, title, 440, 2);
  let y = 78;
  for (const line of lines) {
    ctx.fillText(line, 36, y);
    y += 48;
  }
  if (artist) {
    ctx.fillStyle = "#5b544a";
    ctx.font = "italic 30px Georgia, 'Times New Roman', serif";
    ctx.fillText(artist.length > 30 ? `${artist.slice(0, 29)}...` : artist, 36, Math.max(y + 14, 190));
  }
  return finish(canvas, true);
}

/** Lettering for the far wall of the hall. */
export function makeTitleTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createCanvas(1024, 384);
  ctx.clearRect(0, 0, 1024, 384);
  ctx.fillStyle = "#2b2622";
  ctx.textAlign = "center";
  ctx.font = "500 150px Georgia, 'Times New Roman', serif";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "22px";
  ctx.fillText("ATELIER", 512, 190);
  ctx.font = "italic 44px Georgia, 'Times New Roman', serif";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "6px";
  ctx.fillStyle = "#6b6358";
  ctx.fillText("Virtual Museum", 512, 270);
  return finish(canvas, true);
}
