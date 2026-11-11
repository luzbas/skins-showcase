/**
 * Clay · Duo — the clay console, as data. Each layout is the Blender scene it was designed in
 * (`skins-src/clay/blender/clay_duo.blend`, text block `duo_variants.py`), in the same units: 1 u = 50 pt of the
 * Duo's screen, y pointing up. `clay-duo-skin.tsx` turns units into pixels for the screen's real size, so every piece
 * and control lands where it sat in the render.
 *
 *   full-p    open flat, upright (626 × 890 pt): title label, the picture full width, the black console below it
 *   full-l    open flat, sideways (890 × 626 pt), and fullscreen: the picture full-bleed, the title label top left and
 *             the black console floating along the bottom; both step away while playing
 *   split     propped up on a table: the picture in a black clay frame on the top half; the black console fills the
 *             bottom half (626 × 445 pt) — title, timeline, transport on a sky pad, a volume fader, a row of keys
 *   outer-p   closed, the outer display upright (466 × 678 pt): every button in a black rail under the camera, title,
 *             framed picture and timeline on the leading side, abstract clay shapes above and below as wallpaper
 *   outer-l   closed, the outer display sideways (678 × 466 pt): the rail, the framed picture and the timeline
 *   fs-outer  fullscreen on the closed phone: the picture full-bleed, the rail and timeline floating over it
 *
 * - `piece`: a clay console sprite (decoration), placed by its anchor.
 * - `spot`: where a control goes; `d` is a key's or disc's box (the clay face is about 71% of it), `w`/`h` a strip's
 *   size. `k` makes the control a square clay key of that colour; `vertical` stands the volume slider up as a fader.
 */
import type { ConsoleSpriteName } from './console-sprites';

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

export type KeyColor = 'white' | 'orange' | 'leaf' | 'pink' | 'cream' | 'yellow' | 'sky';

export interface PieceItem {
  piece: ConsoleSpriteName;
  x: number;
  y: number;
}

export interface SpotItem {
  spot: SpotId;
  x: number;
  y: number;
  d?: number;
  w?: number;
  h?: number;
  k?: KeyColor;
  vertical?: boolean;
}

export type LayoutItem = PieceItem | SpotItem;

export type ClayDuoMode = 'full-p' | 'full-l' | 'split' | 'outer-p' | 'outer-l' | 'fs-outer';

export interface ClayDuoLayout {
  /** Scene bounds of the stage: the whole screen, or the bottom half when propped up. */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** The picture's rectangle on the stage; `fill` covers it; `segment` is the top half when propped up. */
  screen: { x: number; y: number; w: number; h: number } | 'fill' | 'segment';
  /** The picture's controls step away while the viewer is idle (it lies under them). */
  overlay?: boolean;
  /** Back to front. */
  items: LayoutItem[];
}

/** Propped up, the top half (626 × 445 pt, y from 0 at the crease): the picture inside its black clay frame. */
export const SPLIT_TOP = {
  w: 12.52,
  h: 8.9,
  picture: { x: 0, y: 4.6, w: 10.82, h: 6.086 },
  frame: { piece: 'frame-split' as ConsoleSpriteName, x: 0, y: 4.6 },
};

/** Keys row of the console: view and casting. */
const keysRow = (x0: number, step: number, y: number, d: number, last?: number): SpotItem[] => [
  { spot: 'captions', x: x0, y, d, k: 'white' },
  { spot: 'settings', x: x0 + step, y, d, k: 'orange' },
  { spot: 'pip', x: x0 + step * 2, y, d, k: 'leaf' },
  { spot: 'cast', x: x0 + step * 3, y, d, k: 'pink' },
  { spot: 'airplay', x: x0 + step * 4, y, d, k: 'cream' },
  { spot: 'fullscreen', x: last ?? x0 + step * 5, y, d, k: 'white' },
];

/** The outer display's rail: one column of keys under the camera. */
const railKeys = (x: number, ys: number[], d: number, dPlay: number): SpotItem[] => [
  { spot: 'back', x, y: ys[0], d, k: 'cream' },
  { spot: 'play', x, y: ys[1], d: dPlay, k: 'yellow' },
  { spot: 'fwd', x, y: ys[2], d, k: 'cream' },
  { spot: 'mute', x, y: ys[3], d, k: 'sky' },
  { spot: 'captions', x, y: ys[4], d, k: 'white' },
  { spot: 'settings', x, y: ys[5], d, k: 'orange' },
  { spot: 'fullscreen', x, y: ys[6], d, k: 'white' },
];

/** Propped up: the bottom half, 626 × 445 pt. The top 24 pt (0.48 u) is the crease's keep-out band. */
const split: ClayDuoLayout = {
  x0: -6.26,
  x1: 6.26,
  y0: -8.9,
  y1: 0,
  screen: 'segment',
  items: [
    { piece: 'desk-split', x: 0, y: -4.75 },
    { piece: 'pad', x: -1.2, y: -5.15 },
    { spot: 'title', x: 0, y: -1.6, w: 10.9, h: 0.85 },
    { spot: 'rail', x: 0, y: -2.95, w: 11.1, h: 1.0 },
    { spot: 'back', x: -3.4, y: -5.15, d: 1.6 },
    { spot: 'play', x: -1.2, y: -5.15, d: 2.4 },
    { spot: 'fwd', x: 1.0, y: -5.15, d: 1.6 },
    { spot: 'volume', x: 4.5, y: -5.1, w: 0.9, h: 3.2, vertical: true },
    { spot: 'mute', x: 4.5, y: -7.5, d: 1.25 },
    ...keysRow(-4.8, 1.42, -7.5, 1.4, 2.3),
  ],
};

/** Open flat, upright: 626 × 890 pt. */
const fullP: ClayDuoLayout = {
  x0: -6.26,
  x1: 6.26,
  y0: -8.9,
  y1: 8.9,
  screen: { x: 0, y: 2.6, w: 12.52, h: 7.0425 },
  items: [
    { spot: 'title', x: 0, y: 7.45, w: 11.1, h: 0.85 },
    { piece: 'bits-portrait', x: 0, y: -2.0 },
    { piece: 'desk-portrait', x: 0, y: -5.6 },
    { piece: 'pad-portrait', x: -1.3, y: -5.4 },
    { spot: 'rail', x: 0, y: -3.75, w: 10.9, h: 0.9 },
    { spot: 'back', x: -3.4, y: -5.4, d: 1.55 },
    { spot: 'play', x: -1.3, y: -5.4, d: 2.3 },
    { spot: 'fwd', x: 0.8, y: -5.4, d: 1.55 },
    { spot: 'volume', x: 4.4, y: -5.3, w: 0.85, h: 2.4, vertical: true },
    { spot: 'mute', x: 4.4, y: -7.35, d: 1.2 },
    ...keysRow(-4.7, 1.35, -7.35, 1.32, 2.05),
  ],
};

/** Open flat, sideways (and fullscreen): 890 × 626 pt, the picture full-bleed under a floating console. */
const fullL: ClayDuoLayout = {
  x0: -8.9,
  x1: 8.9,
  y0: -6.26,
  y1: 6.26,
  screen: 'fill',
  overlay: true,
  items: [
    { spot: 'title', x: -4.6, y: 5.05, w: 7.2, h: 0.85 },
    { piece: 'desk-wide', x: 0, y: -4.15 },
    { spot: 'rail', x: 0, y: -3.4, w: 15.4, h: 0.9 },
    { spot: 'back', x: -7.5, y: -4.7, d: 1.38, k: 'cream' },
    { spot: 'play', x: -6.2, y: -4.7, d: 1.6, k: 'yellow' },
    { spot: 'fwd', x: -4.9, y: -4.7, d: 1.38, k: 'cream' },
    { spot: 'mute', x: -3.3, y: -4.7, d: 1.2 },
    { spot: 'volume', x: -1.35, y: -4.7, w: 2.6, h: 0.6 },
    ...keysRow(1.25, 1.25, -4.7, 1.24),
  ],
};

/** Closed, outer display upright: 466 × 678 pt. Camera top trailing; the rail is the trailing 73 pt. */
const outerP: ClayDuoLayout = {
  x0: -4.66,
  x1: 4.66,
  y0: -6.78,
  y1: 6.78,
  screen: { x: -0.73, y: -0.05, w: 7.28, h: 4.095 },
  items: [
    { piece: 'wall-top', x: -0.73, y: 5.0 },
    { piece: 'wall-bottom', x: -0.73, y: -5.3 },
    { piece: 'frame-op', x: -0.73, y: -0.05 },
    { piece: 'rail-p', x: 3.93, y: -0.55 },
    { spot: 'title', x: -0.73, y: 3.16, w: 6.3, h: 0.9 },
    { spot: 'rail', x: -0.73, y: -2.96, w: 7.42, h: 0.95 },
    ...railKeys(3.93, [4.544, 2.872, 1.2, -0.472, -2.144, -3.816, -5.488], 1.42, 1.62),
  ],
};

/** Closed, outer display sideways: 678 × 466 pt. No title, as on the other Duo skins. */
const outerLKeys = [2.79, 1.65, 0.51, -0.55, -1.61, -2.67, -3.73];
const outerL: ClayDuoLayout = {
  x0: -6.78,
  x1: 6.78,
  y0: -4.66,
  y1: 4.66,
  screen: { x: -0.73, y: 0.76, w: 11.52, h: 6.48 },
  items: [
    { piece: 'frame-ol', x: -0.73, y: 0.76 },
    { piece: 'rail-l', x: 6.05, y: -0.35 },
    { spot: 'rail', x: -0.73, y: -3.64, w: 11.66, h: 0.95 },
    ...railKeys(6.05, outerLKeys, 1.24, 1.47),
  ],
};

/** Fullscreen on the closed phone: the picture full-bleed, the rail and the timeline over it. */
const fsOuter: ClayDuoLayout = {
  x0: -6.78,
  x1: 6.78,
  y0: -4.66,
  y1: 4.66,
  screen: 'fill',
  overlay: true,
  items: [
    { piece: 'rail-fs', x: 6.05, y: -0.35 },
    { spot: 'rail', x: -0.75, y: -3.75, w: 11.0, h: 0.9 },
    ...railKeys(6.05, outerLKeys, 1.2, 1.42),
  ],
};

export const DUO_LAYOUTS: Record<ClayDuoMode, ClayDuoLayout> = {
  'full-p': fullP,
  'full-l': fullL,
  split,
  'outer-p': outerP,
  'outer-l': outerL,
  'fs-outer': fsOuter,
};
