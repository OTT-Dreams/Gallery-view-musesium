// Museum layout: a grid of square rooms joined by doorways.
// Every room is 16 m x 16 m. Neighbouring rooms are connected through a door in the middle of the shared wall.

export const ROOM_SIZE = 16;
export const WALL_T = 0.4; // thickness of the wall between two rooms
export const PITCH = ROOM_SIZE + WALL_T; // distance between two room centres
export const DOOR_W = 3.2;
export const DOOR_H = 3.4;
export const HEIGHT = 5;
export const EYE_LEVEL = 1.7; // centre height of every artwork
export const WALL_MARGIN = 0.5; // how close a visitor can get to a wall
export const PLAYER_RADIUS = 0.3;
const AVG_PER_ROOM = 8;

export type Wall = "N" | "E" | "S" | "W";
export const WALLS: Wall[] = ["N", "E", "S", "W"];

export type Placement = {
  position: [number, number, number];
  rotation: [number, number, number];
};

type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

export type Room = {
  index: number;
  col: number;
  row: number;
  x: number; // world centre
  z: number;
  doors: Record<Wall, "owner" | "shared" | null>; // the owner draws the door frame
  artworks: number[]; // indices into the artwork list
  bench: boolean;
  wallColor: string;
  floorKind: 0 | 1 | 2; // oak, stone, walnut
  hasTitle: boolean;
  rects: Rect[]; // places where a visitor may stand
};

export type HallLayout = {
  rooms: Room[];
  cols: number;
  rows: number;
  placements: Placement[]; // one per artwork
  start: { x: number; z: number; yaw: number };
  roomAt: (x: number, z: number) => Room;
  isWalkable: (x: number, z: number) => boolean;
  visibleRooms: (index: number) => Room[];
};

const WALL_COLORS = ["#e4ddd0", "#d6dccf", "#d9d1c5", "#cdd0d6", "#e2d6cd"];

function wallSlots(room: Room, wall: Wall): number[] {
  if (room.doors[wall]) return [-4.7, 4.7];
  if (room.hasTitle && wall === "N") return [-5, 5];
  return [-5, 0, 5];
}

/** Position along a wall (local x) to world placement. Local x runs left to right when facing the wall. */
export function wallPlacement(room: Room, wall: Wall, offset: number): Placement {
  const half = ROOM_SIZE / 2 - 0.06;
  switch (wall) {
    case "N":
      return { position: [room.x + offset, EYE_LEVEL, room.z - half], rotation: [0, 0, 0] };
    case "E":
      return { position: [room.x + half, EYE_LEVEL, room.z + offset], rotation: [0, -Math.PI / 2, 0] };
    case "S":
      return { position: [room.x - offset, EYE_LEVEL, room.z + half], rotation: [0, Math.PI, 0] };
    default:
      return { position: [room.x - half, EYE_LEVEL, room.z - offset], rotation: [0, Math.PI / 2, 0] };
  }
}

function createRooms(roomCount: number): { rooms: Room[]; cols: number; rows: number } {
  const cols = Math.ceil(Math.sqrt(roomCount));
  const rows = Math.ceil(roomCount / cols);
  const rooms: Room[] = [];

  for (let index = 0; index < roomCount; index += 1) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    rooms.push({
      index,
      col,
      row,
      x: col * PITCH,
      z: row * PITCH,
      doors: { N: null, E: null, S: null, W: null },
      artworks: [],
      bench: index > 0 && (col + row) % 2 === 0,
      wallColor: WALL_COLORS[(col * 3 + row * 5 + index) % WALL_COLORS.length],
      floorKind: index === 0 ? 0 : (((col * 7 + row * 13) % 3) as 0 | 1 | 2),
      hasTitle: index === 0,
      rects: []
    });
  }

  const at = (col: number, row: number) => (col < 0 || row < 0 || col >= cols ? undefined : rooms[row * cols + col]);
  for (const room of rooms) {
    const east = at(room.col + 1, room.row);
    if (east) {
      room.doors.E = "owner";
      east.doors.W = "shared";
    }
    const south = at(room.col, room.row + 1);
    if (south) {
      room.doors.S = "owner";
      south.doors.N = "shared";
    }
  }

  const inner = ROOM_SIZE / 2 - WALL_MARGIN;
  const doorHalf = DOOR_W / 2 - 0.22 - PLAYER_RADIUS;
  for (const room of rooms) {
    room.rects.push({ minX: room.x - inner, maxX: room.x + inner, minZ: room.z - inner, maxZ: room.z + inner });
    const reach = PITCH - ROOM_SIZE + 2 * WALL_MARGIN + 1.2; // door passage length incl. overlap with both rooms
    if (room.doors.E) {
      room.rects.push({ minX: room.x + inner - 0.6, maxX: room.x + inner - 0.6 + reach, minZ: room.z - doorHalf, maxZ: room.z + doorHalf });
    }
    if (room.doors.W) {
      room.rects.push({ minX: room.x - inner + 0.6 - reach, maxX: room.x - inner + 0.6, minZ: room.z - doorHalf, maxZ: room.z + doorHalf });
    }
    if (room.doors.S) {
      room.rects.push({ minX: room.x - doorHalf, maxX: room.x + doorHalf, minZ: room.z + inner - 0.6, maxZ: room.z + inner - 0.6 + reach });
    }
    if (room.doors.N) {
      room.rects.push({ minX: room.x - doorHalf, maxX: room.x + doorHalf, minZ: room.z - inner + 0.6 - reach, maxZ: room.z - inner + 0.6 });
    }
  }

  return { rooms, cols, rows };
}

function assign(rooms: Room[], count: number): Placement[] | null {
  const slots: Array<{ room: Room; wall: Wall; offset: number }> = [];
  for (const room of rooms) {
    room.artworks = [];
    for (const wall of WALLS) {
      for (const offset of wallSlots(room, wall)) slots.push({ room, wall, offset });
    }
  }
  if (slots.length < count) return null;
  const placements: Placement[] = [];
  for (let index = 0; index < count; index += 1) {
    const slot = slots[index];
    slot.room.artworks.push(index);
    placements.push(wallPlacement(slot.room, slot.wall, slot.offset));
  }
  return placements;
}

export function buildLayout(count: number): HallLayout {
  let roomCount = Math.max(1, Math.ceil(count / AVG_PER_ROOM));
  let built = createRooms(roomCount);
  let placements = assign(built.rooms, count);
  while (!placements) {
    roomCount += 1;
    built = createRooms(roomCount);
    placements = assign(built.rooms, count);
  }

  // Drop trailing rooms that ended up empty.
  while (roomCount > 1 && built.rooms[roomCount - 1].artworks.length === 0) {
    const smaller = createRooms(roomCount - 1);
    const smallerPlacements = assign(smaller.rooms, count);
    if (!smallerPlacements) break;
    roomCount -= 1;
    built = smaller;
    placements = smallerPlacements;
  }

  const { rooms, cols, rows } = built;
  const byCell = new Map<string, Room>();
  for (const room of rooms) byCell.set(`${room.col},${room.row}`, room);

  const roomAt = (x: number, z: number): Room => {
    const col = Math.round(x / PITCH);
    const row = Math.round(z / PITCH);
    const exact = byCell.get(`${col},${row}`);
    if (exact) return exact;
    let best = rooms[0];
    let bestDistance = Infinity;
    for (const room of rooms) {
      const distance = (room.x - x) ** 2 + (room.z - z) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = room;
      }
    }
    return best;
  };

  const isWalkable = (x: number, z: number): boolean => {
    const room = roomAt(x, z);
    const inside = room.rects.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ);
    if (!inside) return false;
    if (room.bench && Math.abs(x - room.x) < 0.3 + PLAYER_RADIUS && Math.abs(z - room.z) < 1.25 + PLAYER_RADIUS) {
      return false;
    }
    return true;
  };

  const visibleRooms = (index: number): Room[] => {
    const center = rooms[Math.min(index, rooms.length - 1)];
    const result: Room[] = [];
    for (let dRow = -2; dRow <= 2; dRow += 1) {
      for (let dCol = -2; dCol <= 2; dCol += 1) {
        const far = Math.max(Math.abs(dRow), Math.abs(dCol)) === 2;
        if (far && dRow !== 0 && dCol !== 0) continue; // two rooms away only straight down a line of doors
        if (far && Math.abs(dRow) + Math.abs(dCol) > 2) continue;
        const room = byCell.get(`${center.col + dCol},${center.row + dRow}`);
        if (room) result.push(room);
      }
    }
    return result;
  };

  const first = rooms[0];
  return {
    rooms,
    cols,
    rows,
    placements,
    start: { x: first.x, z: first.z + 4.5, yaw: 0 },
    roomAt,
    isWalkable,
    visibleRooms
  };
}
