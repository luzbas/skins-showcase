// Generated from assets/island/manifest.json (Blender: blender/clay_diorama.blend, text block island_sprites.py).
// Each sprite was rendered around an anchor point; u0..u1 / v0..v1 are its picture bounds in scene units
// relative to that anchor (v points up), so the layout places a piece by its anchor and scale.

import antenna from '../../assets/island/antenna.webp';
import cloud_a from '../../assets/island/cloud-a.webp';
import cloud_b from '../../assets/island/cloud-b.webp';
import cloud_long from '../../assets/island/cloud-long.webp';
import island from '../../assets/island/island.webp';
import island_phone from '../../assets/island/island-phone.webp';
import ledge from '../../assets/island/ledge.webp';
import mini_island from '../../assets/island/mini-island.webp';
import mushroom from '../../assets/island/mushroom.webp';
import mushroom_stem from '../../assets/island/mushroom-stem.webp';
import mushroom_tall from '../../assets/island/mushroom-tall.webp';
import tree from '../../assets/island/tree.webp';
import tree_tall from '../../assets/island/tree-tall.webp';
import tv from '../../assets/island/tv.webp';
import tv_leg from '../../assets/island/tv-leg.webp';
import tv_leg_long from '../../assets/island/tv-leg-long.webp';

export interface SpriteBounds { src: string; u0: number; u1: number; v0: number; v1: number }

export const SPRITES = {
  'antenna': { src: antenna, u0: -0.1804, u1: 0.2012, v0: -1.2891, v1: 1.2839 },
  'cloud-a': { src: cloud_a, u0: -1.7875, u1: 1.7847, v0: -0.7816, v1: 1.6022 },
  'cloud-b': { src: cloud_b, u0: -1.385, u1: 1.3415, v0: -0.6315, v1: 1.2406 },
  'cloud-long': { src: cloud_long, u0: -3.1493, u1: 3.1582, v0: -1.3826, v1: 2.8664 },
  'island': { src: island, u0: -7.564, u1: 7.5829, v0: -2.4356, v1: 1.0496 },
  'island-phone': { src: island_phone, u0: -4.4612, u1: 4.4699, v0: -2.0542, v1: 0.7919 },
  'ledge': { src: ledge, u0: -10.804, u1: 10.6778, v0: -1.2976, v1: 0.7405 },
  'mini-island': { src: mini_island, u0: -2.8837, u1: 2.8385, v0: -0.8367, v1: 0.3507 },
  'mushroom': { src: mushroom, u0: -1.8824, u1: 1.8366, v0: -3.0942, v1: 0.9877 },
  // The tall mushroom's stem without its cap (cut from mushroom-tall), for the phone fullscreen layout.
  'mushroom-stem': { src: mushroom_stem, u0: -1.4492, u1: 0.1446, v0: -3.7453, v1: -1.0118 },
  'mushroom-tall': { src: mushroom_tall, u0: -1.9293, u1: 1.885, v0: -3.7986, v1: 1.0883 },
  'tree': { src: tree, u0: -1.8191, u1: 1.795, v0: -3.6208, v1: 1.8766 },
  'tree-tall': { src: tree_tall, u0: -1.806, u1: 1.7536, v0: -4.4153, v1: 2.3502 },
  'tv': { src: tv, u0: -4.3878, u1: 4.4194, v0: -3.1654, v1: 2.6278 },
  'tv-leg': { src: tv_leg, u0: -0.3737, u1: 0.3888, v0: -0.7485, v1: 0.7575 },
  'tv-leg-long': { src: tv_leg_long, u0: -0.3517, u1: 0.3507, v0: -1.3363, v1: 1.3568 },
} satisfies Record<string, SpriteBounds>;

export type SpriteName = keyof typeof SPRITES;
