/**
 * The island diorama, as data. Each layout is the Blender scene it was designed in (`blender/clay_diorama.blend`,
 * text block `dio_variants.py`: B / B_phone / FSI_desktop / FSI_phone_grouped), in the same scene units with y
 * pointing up. `island-skin.tsx` turns units into pixels for the player's size, so every piece and control lands
 * where it sat in the render.
 *
 * - `piece`: a clay sprite (decoration), placed by its anchor, with an optional scale and tilt.
 * - `spot`: where a control goes; `d` is a disc's diameter, `w`/`h` a strip's size.
 */
import type { SpriteName } from './sprites';

export type SpotId =
  | 'play'
  | 'back'
  | 'fwd'
  | 'mute'
  | 'volume'
  | 'captions'
  | 'settings'
  | 'pip'
  | 'fullscreen'
  | 'cast'
  | 'airplay'
  | 'rail'
  | 'title';

export interface PieceItem {
  piece: SpriteName;
  x: number;
  y: number;
  s?: number;
  rot?: number;
}

export interface SpotItem {
  spot: SpotId;
  x: number;
  y: number;
  /** Diameter, for a disc. */
  d?: number;
  w?: number;
  h?: number;
}

export type LayoutItem = PieceItem | SpotItem;

export type LayoutMode = 'desktop' | 'phone' | 'fs-desktop' | 'fs-phone';

export interface IslandLayout {
  /** Scene bounds that fill the player (inline) or fit inside the screen (fullscreen). */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** The video's rectangle; `fill` covers the whole player. */
  screen: { x: number; y: number; w: number; h: number } | 'fill';
  /** Back to front. */
  items: LayoutItem[];
}

/** Desktop: the clay TV on its floating island, mushroom (sound) on the left, tree (view options) on the right. */
const desktop: IslandLayout = {
  x0: -9.6,
  x1: 9.6,
  y0: -4.75,
  y1: 7.25,
  screen: { x: 0, y: 1.85, w: 6.4, h: 3.6 },
  items: [
    { piece: 'cloud-b', x: 7.7, y: 5.6 },
    { piece: 'cloud-a', x: 8.9, y: 2.6, s: 0.5 },
    { piece: 'cloud-b', x: -3.6, y: 6.2, s: 0.55 },
    { piece: 'cloud-long', x: -6.9, y: 4.55, s: 0.75 },
    { piece: 'antenna', x: -1.15, y: 5.2, rot: -28 },
    { piece: 'antenna', x: 1.15, y: 5.2, rot: 28 },
    { piece: 'island', x: 0, y: -2.15 },
    { piece: 'tv-leg', x: -3.0, y: -1.55 },
    { piece: 'tv-leg', x: 3.0, y: -1.55 },
    { piece: 'tv', x: 0, y: 1.85 },
    { piece: 'mushroom', x: -6.1, y: 0.75 },
    { piece: 'tree', x: 6.2, y: 1.25 },
    { spot: 'title', x: -6.9, y: 4.45, w: 4.2, h: 1.3 },
    { spot: 'cast', x: -1.72, y: 6.2, d: 0.96 },
    { spot: 'airplay', x: 1.72, y: 6.2, d: 0.96 },
    { spot: 'rail', x: 0, y: -0.58, w: 7.4, h: 0.66 },
    { spot: 'volume', x: -6.1, y: 0.62, w: 2.3, h: 0.55 },
    { spot: 'mute', x: -6.1, y: -1.05, d: 1.0 },
    { spot: 'captions', x: 5.45, y: 2.0, d: 0.96 },
    { spot: 'settings', x: 6.95, y: 2.0, d: 0.96 },
    { spot: 'pip', x: 5.45, y: 0.6, d: 0.96 },
    { spot: 'fullscreen', x: 6.95, y: 0.6, d: 0.96 },
    { spot: 'back', x: -1.9, y: -1.75, d: 1.1 },
    { spot: 'play', x: 0, y: -1.6, d: 1.7 },
    { spot: 'fwd', x: 1.9, y: -1.75, d: 1.1 },
  ],
};

/** Phone: the same island stacked up — title cloud, TV with antennas, then the island with everything else. */
const phone: IslandLayout = {
  x0: -4.75,
  x1: 4.75,
  y0: -3.05,
  y1: 12.1,
  screen: { x: 0, y: 5.15, w: 6.0, h: 3.375 },
  items: [
    { piece: 'cloud-long', x: 0, y: 10.55, s: 0.68 },
    { piece: 'cloud-b', x: 3.9, y: 8.3, s: 0.45 },
    { piece: 'cloud-a', x: -3.9, y: 7.9, s: 0.4 },
    { piece: 'antenna', x: -1.0, y: 8.2, s: 0.83, rot: -28 },
    { piece: 'antenna', x: 1.0, y: 8.2, s: 0.83, rot: 28 },
    // Behind the island, so the TV legs sink into the grass.
    { piece: 'tv-leg-long', x: -1.9, y: 0.68, s: 1.25 },
    { piece: 'tv-leg-long', x: 1.9, y: 0.68, s: 1.25 },
    { piece: 'island-phone', x: 0, y: -0.9 },
    // In front of the island, standing on the grass.
    { piece: 'mushroom', x: -3.4, y: 0.65, s: 0.62 },
    { piece: 'tree', x: 3.4, y: 0.85, s: 0.7 },
    { piece: 'tv', x: 0, y: 5.15, s: 0.9375 },
    { spot: 'title', x: 0, y: 10.4, w: 4.0, h: 1.2 },
    { spot: 'cast', x: -1.45, y: 9.0, d: 1.0 },
    { spot: 'airplay', x: 1.45, y: 9.0, d: 1.0 },
    { spot: 'rail', x: 0, y: 2.85, w: 6.6, h: 0.62 },
    { spot: 'mute', x: -3.4, y: 0.62, d: 1.0 },
    { spot: 'captions', x: 2.88, y: 1.4, d: 0.92 },
    { spot: 'settings', x: 3.92, y: 1.4, d: 0.92 },
    { spot: 'pip', x: 2.88, y: 0.32, d: 0.92 },
    { spot: 'fullscreen', x: 3.92, y: 0.32, d: 0.92 },
    { spot: 'back', x: -1.45, y: -0.5, d: 1.0 },
    { spot: 'play', x: 0, y: -0.35, d: 1.5 },
    { spot: 'fwd', x: 1.45, y: -0.5, d: 1.0 },
  ],
};

/** Desktop fullscreen: the video fills the screen; the island's pieces stand over its edges while controls show. */
const fsDesktop: IslandLayout = {
  x0: -8,
  x1: 8,
  y0: -4.5,
  y1: 4.5,
  screen: 'fill',
  items: [
    { piece: 'cloud-long', x: -5.0, y: 2.95, s: 0.71 },
    { piece: 'cloud-b', x: 4.7, y: 3.1, s: 0.96 },
    { piece: 'mushroom', x: -5.95, y: -1.45, s: 0.86 },
    { piece: 'tree', x: 5.85, y: -0.55, s: 0.86 },
    { piece: 'ledge', x: 0, y: -3.85 },
    { piece: 'mini-island', x: 0, y: -1.0 },
    { spot: 'title', x: -5.0, y: 2.85, w: 3.8, h: 1.1 },
    { spot: 'cast', x: 4.2, y: 3.07, d: 0.76 },
    { spot: 'airplay', x: 5.25, y: 3.07, d: 0.76 },
    { spot: 'volume', x: -5.95, y: -1.5, w: 2.1, h: 0.5 },
    { spot: 'mute', x: -5.95, y: -2.75, d: 0.84 },
    { spot: 'captions', x: 5.2, y: 0.07, d: 0.88 },
    { spot: 'settings', x: 6.5, y: 0.07, d: 0.88 },
    { spot: 'pip', x: 5.2, y: -1.17, d: 0.88 },
    { spot: 'fullscreen', x: 6.5, y: -1.17, d: 0.88 },
    { spot: 'rail', x: 0, y: -3.85, w: 11.0, h: 0.66 },
    { spot: 'back', x: -1.9, y: -0.05, d: 1.2 },
    { spot: 'play', x: 0, y: 0.15, d: 2.0 },
    { spot: 'fwd', x: 1.9, y: -0.05, d: 1.2 },
  ],
};

/**
 * Phone fullscreen (landscape, no scrolling): every control is in a group — the mushroom stem holds sound, the tree
 * a 2 × 2 of view options and casting, the title cloud the way out of fullscreen, the little island the transport.
 * Cast and AirPlay share the tree's fourth spot: browsers offer one or the other, and the one a browser can't use
 * hides itself (see island.css).
 * The phone's own buttons set the volume, so there's no volume slider.
 */
const fsPhone: IslandLayout = {
  x0: -9.75,
  x1: 9.75,
  y0: -4.5,
  y1: 4.5,
  screen: 'fill',
  items: [
    { piece: 'cloud-long', x: -4.7, y: 3.15 },
    { piece: 'mushroom-stem', x: -7.55, y: 0.35 },
    { piece: 'tree-tall', x: 7.95, y: 0.75 },
    { piece: 'ledge', x: 0, y: -3.85 },
    { piece: 'mini-island', x: 0, y: -1.15, s: 1.25 },
    { spot: 'fullscreen', x: -6.7, y: 3.1, d: 1.16 },
    { spot: 'title', x: -3.75, y: 3.0, w: 3.6, h: 1.1 },
    { spot: 'mute', x: -8.2, y: -2.0, d: 1.2 },
    { spot: 'captions', x: 7.2, y: 1.9, d: 1.16 },
    { spot: 'settings', x: 8.7, y: 1.9, d: 1.16 },
    { spot: 'pip', x: 7.2, y: 0.45, d: 1.16 },
    { spot: 'cast', x: 8.7, y: 0.45, d: 1.16 },
    { spot: 'airplay', x: 8.7, y: 0.45, d: 1.16 },
    { spot: 'rail', x: 0.3, y: -3.85, w: 13.6, h: 0.78 },
    { spot: 'back', x: -2.45, y: -0.05, d: 1.56 },
    { spot: 'play', x: 0, y: 0.2, d: 2.5 },
    { spot: 'fwd', x: 2.45, y: -0.05, d: 1.56 },
  ],
};

export const LAYOUTS: Record<LayoutMode, IslandLayout> = {
  desktop,
  phone,
  'fs-desktop': fsDesktop,
  'fs-phone': fsPhone,
};
