/*
 * The sketch skin's pen. Every line is a filled shape built along a centre path: a slow bow over
 * the whole line, finer jitter on top, a thin start where the pen lands and a slight lift at the
 * end, and an overshoot past corners. A seed picks one hand-traced version; a new seed redraws
 * the same line by a slightly different hand, which is how controls "boil" while hovered.
 */

export type Point = readonly [number, number];

export interface Pen {
  /** Full stroke width. */
  w: number;
  /** Most the line may drift sideways over its length, and how much per unit of length. */
  bow: number;
  bowk: number;
  /** Fine jitter amplitude and wavelength. */
  fine: number;
  wave: number;
  /** Sampling step along the line. */
  step: number;
  /** Lengths over which the pen lands (thin start) and lifts (thin end). */
  land: number;
  lift: number;
  /** How far a line runs past its ends or, for a closed shape, past its start. */
  over: number;
}

export const PENS = {
  icon: { w: 1.75, bow: 0.3, bowk: 0.03, fine: 0.13, wave: 2.4, step: 0.3, land: 1.4, lift: 1.6, over: 0.6 },
  hatchIcon: { w: 0.8, bow: 0.1, bowk: 0.02, fine: 0.06, wave: 2, step: 0.35, land: 0.6, lift: 0.6, over: 0.2 },
  edge: { w: 1.9, bow: 2.2, bowk: 0.006, fine: 0.35, wave: 14, step: 2, land: 8, lift: 10, over: 3.5 },
  disc: { w: 1.8, bow: 0.9, bowk: 0.01, fine: 0.25, wave: 9, step: 0.8, land: 5, lift: 6, over: 0 },
  scribble: { w: 1.4, bow: 1.1, bowk: 0.012, fine: 0.3, wave: 7, step: 0.8, land: 4, lift: 5, over: 0 },
  ring: { w: 2.2, bow: 1.1, bowk: 0.012, fine: 0.3, wave: 7, step: 0.8, land: 3, lift: 5, over: 0 },
  track: { w: 2.6, bow: 2.4, bowk: 0.006, fine: 0.45, wave: 16, step: 2, land: 10, lift: 10, over: 2.5 },
  hatchTrack: { w: 1.3, bow: 0.35, bowk: 0.03, fine: 0.15, wave: 5, step: 1, land: 2, lift: 2, over: 0.8 },
  underline: { w: 1.8, bow: 1.4, bowk: 0.01, fine: 0.35, wave: 12, step: 1.5, land: 8, lift: 8, over: 0 },
  lead: { w: 1.4, bow: 1.2, bowk: 0.006, fine: 0.25, wave: 12, step: 1.5, land: 4, lift: 6, over: 1 },
  hair: { w: 0.85, bow: 0.6, bowk: 0.008, fine: 0.13, wave: 8, step: 1.5, land: 2, lift: 3, over: 0.8 },
  frame: { w: 2.1, bow: 1.6, bowk: 0.006, fine: 0.32, wave: 14, step: 2, land: 8, lift: 10, over: 2.5 },
} satisfies Record<string, Pen>;

const round = (n: number) => Math.round(n * 100) / 100;

/** A small deterministic generator, so one seed always draws the same line. */
export function random(seed: number) {
  let s = (Math.abs(Math.floor(seed * 7919)) % 233280) + 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function hash(i: number, seed: number) {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/** Smooth 1D value noise in [-1, 1]. */
function noise(x: number, seed: number) {
  const i = Math.floor(x);
  let f = x - i;
  f = f * f * (3 - 2 * f);
  return hash(i, seed) * (1 - f) + hash(i + 1, seed) * f;
}

/** A stable number for a name, so each control keeps its own hand between renders. */
export function seedOf(key: string) {
  let h = 7;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 10007;
  return h / 97;
}

function toward(p: Point, q: Point, d: number): Point {
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const L = Math.hypot(dx, dy) || 1;
  return [p[0] + (dx / L) * d, p[1] + (dy / L) * d];
}

/** One pen stroke through `points`, returned as a closed SVG outline to fill. */
export function stroke(points: readonly Point[], pen: Pen, seed: number, closed = false): string {
  const next = random(seed + 1);
  const P: Point[] = points.slice();

  if (closed) {
    P.push(P[0]);
    if (pen.over) P.push(toward(P[0], P[1], pen.over * (0.6 + 0.8 * next())));
  } else if (pen.over) {
    P[0] = toward(P[0], P[1], -pen.over * (0.3 + 0.7 * next()));
    const last = P.length - 1;
    P[last] = toward(P[last], P[last - 1], -pen.over * (0.3 + 0.7 * next()));
  }

  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = cum[cum.length - 1];
  if (L < 0.05) return '';

  const at = (s: number): Point => {
    s = Math.max(0, Math.min(L, s));
    let j = 1;
    while (j < cum.length - 1 && cum[j] < s) j++;
    const t = (s - cum[j - 1]) / (cum[j] - cum[j - 1] || 1);
    return [P[j - 1][0] + (P[j][0] - P[j - 1][0]) * t, P[j - 1][1] + (P[j][1] - P[j - 1][1]) * t];
  };

  const n = Math.max(6, Math.ceil(L / pen.step));
  const phase = next() * 50;
  const bow = Math.min(pen.bow, L * pen.bowk);
  const left: string[] = [];
  const right: string[] = [];

  for (let k = 0; k <= n; k++) {
    const s = (L * k) / n;
    const p = at(s);
    const a = at(s - pen.step * 1.5);
    const b = at(s + pen.step * 1.5);
    const tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / tl;
    const ny = (b[0] - a[0]) / tl;
    const off =
      bow * noise((s / L) * 1.7 + phase, seed) +
      pen.fine * (0.7 * noise(s / pen.wave + phase * 2, seed + 3) + 0.3 * noise(s / (pen.wave * 0.3) + phase, seed + 5));
    const w =
      pen.w * 0.5 * (0.45 + 0.55 * (1 - Math.exp(-s / pen.land))) * (1 - 0.4 * Math.exp(-(L - s) / pen.lift));
    const cx = p[0] + nx * off;
    const cy = p[1] + ny * off;
    left.push(`${round(cx + nx * w)} ${round(cy + ny * w)}`);
    right.push(`${round(cx - nx * w)} ${round(cy - ny * w)}`);
  }

  return `M${left.join('L')}L${right.reverse().join('L')}Z`;
}

/** A plain polyline path, used as the centre line that masks a draw-on. */
export function polyline(points: readonly Point[]) {
  return `M${points.map((p) => `${round(p[0])} ${round(p[1])}`).join('L')}`;
}

export function arc(cx: number, cy: number, r: number, a0: number, a1: number, n?: number): Point[] {
  const steps = n ?? Math.max(6, Math.ceil(Math.abs(a1 - a0) / 15));
  const out: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

/** An ellipse traced from a random start; `lap` degrees past a full turn spiral slightly inward. */
export function loop(cx: number, cy: number, rx: number, ry: number, seed: number, lap: number): Point[] {
  const next = random(seed + 9);
  const a0 = next() * 360;
  const sweep = 360 + lap;
  const n = Math.ceil(sweep / 9);
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = ((a0 + sweep * t) * Math.PI) / 180;
    const k = 1 + 0.035 * noise(t * 4, seed) - (lap ? 0.05 * t : 0);
    out.push([cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)]);
  }
  return out;
}

export function box(x: number, y: number, w: number, h: number, r: number): Point[] {
  return [
    [x + r, y], [x + w - r, y], [x + w, y + r], [x + w, y + h - r],
    [x + w - r, y + h], [x + r, y + h], [x, y + h - r], [x, y + r],
  ];
}

export function arrowhead(tip: Point, degrees: number, size: number, pen: Pen, seed: number) {
  return [-36, 36]
    .map((spread, i) => {
      const a = ((degrees + 180 + spread) * Math.PI) / 180;
      return stroke([tip, [tip[0] + size * Math.cos(a), tip[1] + size * Math.sin(a)]], pen, seed + i * 3.1);
    })
    .join('');
}

/** 45° hatching across a box (lines x + y = c) with jittered spacing and inset ends. */
export function hatch(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  gap: number,
  pen: Pen,
  seed: number,
  keep?: (x: number, y: number) => boolean
) {
  const next = random(seed + 4);
  let out = '';
  let line = 0;
  const flush = (run: Point[]) => {
    if (run.length < 2) return;
    const a = run[0];
    const b = run[run.length - 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 0.9) return;
    const ia = Math.min(L * 0.2, next() * pen.over * 1.5);
    const ib = Math.min(L * 0.2, next() * pen.over * 1.5);
    out += stroke([toward(a, b, ia), toward(b, a, ib)], pen, seed + line++ * 0.37);
  };

  for (let c = x0 + y0 + gap * (0.3 + 0.5 * next()); c < x1 + y1; c += gap * (0.75 + 0.5 * next())) {
    const xa = Math.max(x0, c - y1);
    const xb = Math.min(x1, c - y0);
    let run: Point[] = [];
    for (let i = 0; i <= 24; i++) {
      const px = xa + ((xb - xa) * i) / 24;
      const py = c - px;
      if (!keep || keep(px, py)) {
        run.push([px, py]);
        continue;
      }
      flush(run);
      run = [];
    }
    flush(run);
  }
  return out;
}

export interface PaperShape {
  fill: string;
  ink: string;
  /** Straight centre line around the four edges, for masking a draw-on. */
  center: string;
}

/** A cut paper scrap: a wobbly fill, then four inked edges drawn past the corners, a little off-register. */
export function paper(w: number, h: number, seed: number): PaperShape {
  const next = random(seed);
  const j = () => (next() - 0.5) * 2.4;
  const c: Point[] = [[j(), j()], [w + j(), j()], [w + j(), h + j()], [j(), h + j()]];
  let fill = `M${round(c[0][0])} ${round(c[0][1])}`;
  for (let i = 0; i < 4; i++) {
    const p = c[i];
    const q = c[(i + 1) % 4];
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const L = Math.hypot(dx, dy) || 1;
    const b = (next() - 0.5) * 2.4;
    fill += `Q${round((p[0] + q[0]) / 2 - (dy / L) * b)} ${round((p[1] + q[1]) / 2 + (dx / L) * b)} ${round(q[0])} ${round(q[1])}`;
  }
  const e = c.map((p): Point => [p[0] + (next() - 0.5) * 2, p[1] + (next() - 0.5) * 2]);
  let ink = '';
  for (let i = 0; i < 4; i++) ink += stroke([e[i], e[(i + 1) % 4]], PENS.edge, seed + i * 1.7);
  return { fill: `${fill}Z`, ink, center: polyline([e[0], e[1], e[2], e[3], e[0]]) };
}

/** A paper disc with a pencil ring that runs a little past its start. */
export function disc(w: number, h: number, seed: number) {
  const rx = w / 2 - 1.5;
  const ry = h / 2 - 1.5;
  return {
    fill: `${polyline(loop(w / 2, h / 2, rx, ry, seed, 0))}Z`,
    ink: stroke(loop(w / 2, h / 2, rx, ry, seed + 2, 28), PENS.disc, seed + 3),
  };
}

/** A quick loop drawn around a control: the hover scribble and, in red, the focus ring. */
export function scribble(w: number, h: number, seed: number, pen: Pen = PENS.scribble) {
  const points = loop(w / 2, h / 2, w / 2 + 1.5, h / 2 + 0.5, seed, 55);
  return { ink: stroke(points, pen, seed + 1), center: polyline(points) };
}

/** A loose underline across `w`. */
export function underline(w: number, seed: number) {
  const next = random(seed);
  const points: Point[] = [[2, 5.5], [w * 0.35, 4 + next() * 1.5], [w * 0.7, 5 + next() * 1.5], [w - 4, 4.6]];
  return { ink: stroke(points, PENS.underline, seed), center: polyline(points) };
}
