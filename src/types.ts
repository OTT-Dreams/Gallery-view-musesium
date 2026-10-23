export type Artwork = {
  id: string;
  title: string;
  artist?: string;
  description: string;
  width: number;
  height: number;
  thumbUrl: string;
  fullUrl: string;
  order: number;
};

export type Collection = {
  artworks: Artwork[];
  total: number;
  displayed: number;
};

export type ApiFailure = {
  error: string;
  message?: string;
};

export type ControlsApi = {
  setMove: (x: number, y: number) => void;
  look: (deltaX: number, deltaY: number) => void;
  teleport: (x: number, z: number, yaw?: number) => void;
  getPosition: () => { x: number; z: number; yaw: number };
};

export type ViewerState = {
  index: number;
};
