/*
 * Geometry for the sketch icons on an 18-unit grid. Each icon is a list of pen strokes, plus
 * optional thin hatching for its "on" or filled state; `pen.ts` draws them.
 */

import { arc, box, loop, type Point } from './pen';

export type IconStroke =
  | { kind: 'line'; points: Point[]; closed?: boolean }
  | { kind: 'arrow'; tip: Point; degrees: number; size: number };

export interface IconShape {
  strokes: IconStroke[];
  hatch?: { box: [number, number, number, number]; gap: number; keep?: (x: number, y: number) => boolean };
}

const line = (points: Point[], closed = false): IconStroke => ({ kind: 'line', points, closed });
const at = (cx: number, cy: number, r: number, deg: number): Point => [
  cx + r * Math.cos((deg * Math.PI) / 180),
  cy + r * Math.sin((deg * Math.PI) / 180),
];

const speaker = line([[2.4, 6.8], [5.4, 6.8], [9.3, 3.5], [9.3, 14.6], [5.5, 11.3], [2.4, 11.3]], true);
const captionLines = [
  line([[4, 8], [7.6, 8]]), line([[9.6, 8], [14, 8]]), line([[4, 11], [10.8, 11]]), line([[12.6, 11], [14, 11]]),
];
const fullscreenCorners = (out: boolean) => {
  const k = 4.2;
  return ([[2.4, 2.4, 1, 1], [15.6, 2.4, -1, 1], [15.6, 15.6, -1, -1], [2.4, 15.6, 1, -1]] as const).map(([cx, cy, sx, sy]) =>
    out
      ? line([[cx, cy + sy * k], [cx, cy], [cx + sx * k, cy]])
      : line([[cx + sx * 0.4, cy + sy * k], [cx + sx * k, cy + sy * k], [cx + sx * k, cy + sy * 0.4]])
  );
};
const castOutline = [
  line([[1.4, 7.4], [1.6, 2.6], [16.6, 2.8], [16.4, 15.2], [9.6, 15.4]]),
  line(arc(1.4, 16.4, 3, -90, 0)),
  line(arc(1.4, 16.4, 6.4, -90, 0)),
];
const airplayOutline = [
  line([[3.6, 13.8], [1.4, 13.6], [1.6, 2.2], [16.6, 2.4], [16.4, 13.8], [14.4, 13.9]]),
  line([[9, 9], [13.2, 15.6], [4.8, 15.6]], true),
];
const pipOutline = [line(box(1.4, 3, 15.2, 12, 1.4), true), line(box(9.4, 9, 5.4, 4.2, 0.8), true)];

function gear(): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2 - Math.PI / 2;
    const tooth = Math.max(-1, Math.min(1, Math.cos(8 * a) * 1.8));
    const r = 6.1 + 1.25 * tooth;
    points.push([9 + r * Math.cos(a), 9 + r * Math.sin(a)]);
  }
  return points;
}

export const ICON_SHAPES = {
  play: { strokes: [line([[5, 3], [14.8, 9], [5.2, 15]], true)] },
  pause: { strokes: [line(box(4.2, 3.2, 3.2, 11.6, 1), true), line(box(10.6, 3.2, 3.2, 11.6, 1), true)] },
  restart: {
    strokes: [line(arc(9, 9.4, 5.8, 250, -40)), { kind: 'arrow', tip: at(9, 9.4, 5.8, -40), degrees: -130, size: 3 }],
  },
  seek: { strokes: [line(arc(9, 9.6, 6.2, 125, 330)), { kind: 'arrow', tip: at(9, 9.6, 6.2, 330), degrees: 60, size: 3.1 }] },
  volumeHigh: { strokes: [speaker, line(arc(10.6, 9, 2.8, -48, 48)), line(arc(10.6, 9, 5.6, -52, 52))] },
  volumeLow: { strokes: [speaker, line(arc(10.6, 9, 2.8, -48, 48))] },
  volumeOff: { strokes: [speaker, line([[11.8, 6.6], [16.2, 11.4]]), line([[16.2, 6.6], [11.8, 11.5]])] },
  captionsOff: { strokes: [line(box(1.4, 3.4, 15.2, 11.2, 1.6), true), ...captionLines] },
  captionsOn: {
    strokes: [line(box(1.4, 3.4, 15.2, 11.2, 1.6), true), ...captionLines],
    hatch: { box: [2.2, 4.2, 15.8, 13.8], gap: 1.5, keep: (_x, y) => !((y > 6.6 && y < 9.4) || (y > 9.6 && y < 12.4)) },
  },
  fullscreenEnter: { strokes: fullscreenCorners(true) },
  fullscreenExit: { strokes: fullscreenCorners(false) },
  pipEnter: { strokes: pipOutline, hatch: { box: [9.8, 9.4, 14.4, 12.8], gap: 1.2 } },
  pipExit: {
    strokes: [...pipOutline, line([[8, 7.9], [4.6, 5.4]]), { kind: 'arrow', tip: [4.6, 5.4], degrees: 216, size: 2.6 }],
  },
  castEnter: { strokes: castOutline },
  castExit: {
    strokes: castOutline,
    hatch: { box: [4.4, 5, 14.4, 13], gap: 1.4, keep: (x, y) => (x - 1.4) ** 2 + (y - 16.4) ** 2 > 8.2 ** 2 },
  },
  airplayEnter: { strokes: airplayOutline },
  airplayExit: { strokes: airplayOutline, hatch: { box: [5.4, 10, 12.6, 15.2], gap: 1.2, keep: (x, y) => Math.abs(x - 9) < (y - 9) * 0.62 } },
  check: { strokes: [line([[3.4, 9.6], [7, 13.4], [14.8, 4.2]])] },
  chevron: { strokes: [line([[7, 4.2], [11.8, 9], [7, 13.8]])] },
  gear: { strokes: [line(gear(), true), line(loop(9, 9, 2.3, 2.3, 3, 30))] },
  switches: {
    strokes: [line([...arc(5.4, 9, 3.8, 90, 270, 8), ...arc(12.6, 9, 3.8, -90, 90, 8)], true), line(loop(12.4, 9, 2, 2, 5, 35))],
    hatch: { box: [10.4, 7, 14.4, 11], gap: 1, keep: (x, y) => (x - 12.4) ** 2 + (y - 9) ** 2 < 3.2 },
  },
  speech: {
    strokes: [
      line(loop(5.6, 6.2, 2.4, 2.5, 7, 35)),
      line(arc(5.6, 15.6, 4.2, 182, 358, 6)),
      line(arc(11.4, 8.8, 2.4, -40, 40, 3)),
      line(arc(11.4, 8.8, 4.8, -45, 45, 4)),
    ],
  },
  speed: { strokes: [line(arc(9, 10, 6.6, 145, 395, 10)), line([[9, 10], [4.8, 5.8]]), line(loop(9, 10, 1, 1, 2, 20))] },
  spinner: { strokes: [line(arc(9, 9, 6.4, -90, 180, 10))] },
} satisfies Record<string, IconShape>;

export type IconName = keyof typeof ICON_SHAPES;
