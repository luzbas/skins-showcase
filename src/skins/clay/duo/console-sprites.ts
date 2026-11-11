// Generated from assets/manifest.json (Blender: skins-src/clay/blender/clay_duo.blend, text block duo_sprites.py).
// Each console piece was rendered around an anchor point; u0..u1 / v0..v1 are its picture bounds in scene units
// (1 u = 50 pt of the Duo's screen) relative to that anchor, v pointing up.

import bits_portrait from './assets/bits-portrait.webp';
import desk_portrait from './assets/desk-portrait.webp';
import desk_split from './assets/desk-split.webp';
import desk_wide from './assets/desk-wide.webp';
import frame_ol from './assets/frame-ol.webp';
import frame_op from './assets/frame-op.webp';
import frame_split from './assets/frame-split.webp';
import pad from './assets/pad.webp';
import pad_portrait from './assets/pad-portrait.webp';
import rail_fs from './assets/rail-fs.webp';
import rail_l from './assets/rail-l.webp';
import rail_p from './assets/rail-p.webp';
import wall_bottom from './assets/wall-bottom.webp';
import wall_top from './assets/wall-top.webp';

export interface ConsoleSprite { src: string; u0: number; u1: number; v0: number; v1: number }

export const CONSOLE_SPRITES = {
  'bits-portrait': { src: bits_portrait, u0: -4.5281, u1: 4.8937, v0: -0.3013, v1: 0.605 },
  'desk-portrait': { src: desk_portrait, u0: -5.9421, u1: 5.9594, v0: -2.7904, v1: 2.8278 },
  'desk-split': { src: desk_split, u0: -6.0371, u1: 6.0602, v0: -3.9468, v1: 3.9713 },
  'desk-wide': { src: desk_wide, u0: -8.2738, u1: 8.2902, v0: -1.5984, v1: 1.624 },
  'frame-ol': { src: frame_ol, u0: -6.0858, u1: 6.1035, v0: -3.5369, v1: 3.587 },
  'frame-op': { src: frame_op, u0: -3.9731, u1: 3.9764, v0: -2.3408, v1: 2.3962 },
  'frame-split': { src: frame_split, u0: -5.9583, u1: 5.9789, v0: -3.5549, v1: 3.6179 },
  'pad': { src: pad, u0: -3.1424, u1: 3.229, v0: -1.3478, v1: 1.4162 },
  'pad-portrait': { src: pad_portrait, u0: -3.049, u1: 3.0919, v0: -1.0994, v1: 1.1637 },
  'rail-fs': { src: rail_fs, u0: -0.7257, u1: 0.7324, v0: -3.9943, v1: 3.9737 },
  'rail-l': { src: rail_l, u0: -0.8058, u1: 0.8216, v0: -4.1296, v1: 4.1556 },
  'rail-p': { src: rail_p, u0: -0.8051, u1: 0.809, v0: -5.6533, v1: 5.6828 },
  'wall-bottom': { src: wall_bottom, u0: -3.8565, u1: 3.5222, v0: -1.4996, v1: 1.4008 },
  'wall-top': { src: wall_top, u0: -3.8994, u1: 3.6075, v0: -1.0161, v1: 1.7947 },
} satisfies Record<string, ConsoleSprite>;

export type ConsoleSpriteName = keyof typeof CONSOLE_SPRITES;
