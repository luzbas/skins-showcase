/** @jsxImportSource react */

// The closed phone's portrait outer display has room to spare above the title and below the pins. This fills it like
// a sheet of a schematic: parts, traces and vias, no words or numbers, all drawn by the Sketch skin's pen. Decorative.
import { useMemo } from 'react';

import { PENS, arc, box, hatch, loop, random, seedOf, stroke, type Point } from '../skin/video/sketch/pen';

/** The leading side of the portrait outer display, in points: 466 pt wide less the 73 pt rail, 678 pt tall. */
const W = 393;
const H = 678;

const f = (n: number) => Math.round(n * 10) / 10;
const dot = (x: number, y: number, r = 2.6) => `M${f(x - r)} ${f(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

function draw() {
  const ink: string[] = [];
  const soft: string[] = [];
  let k = 0;
  const seed = () => seedOf('duo-wallpaper') + (k += 1.37);
  const line = (to: string[], pts: Point[], pen = PENS.hair, closed = false) => to.push(stroke(pts, pen, seed(), closed));
  const rect = (to: string[], x: number, y: number, w: number, h: number, pen = PENS.hair) => line(to, box(x, y, w, h, 0.6), pen, true);
  const ring = (to: string[], x: number, y: number, r: number, pen = PENS.hair) => to.push(stroke(loop(x, y, r, r, seed(), 14), pen, seed()));
  const shade = (to: string[], x0: number, y0: number, x1: number, y1: number, gap = 3.2) => to.push(hatch(x0, y0, x1, y1, gap, PENS.hatchIcon, seed()));
  const via = (x: number, y: number) => ring(soft, x, y, 3.2);
  const ground = (x: number, y: number) => {
    line(ink, [[x - 12, y], [x + 12, y]], PENS.lead);
    line(ink, [[x - 8, y + 5], [x + 8, y + 5]]);
    line(ink, [[x - 4, y + 10], [x + 4, y + 10]]);
  };

  // ---------- Top: a coil, a transistor and a big chip on one net, with an LED off its corner ----------
  // A faint wave along the top edge, like a trace on a scope.
  const wave: Point[] = [];
  for (let x = 14; x <= 379; x += 3) wave.push([x, 16 + Math.sin(x / 11) * 5 * Math.sin(x / 70)]);
  line(soft, wave);

  // Inductor: four humps on the trace.
  line(ink, [[20, 74], [38, 74]], PENS.lead);
  for (let i = 0; i < 4; i++) line(ink, arc(46 + i * 16, 74, 8, 180, 360), PENS.lead);
  line(ink, [[102, 74], [124, 74]], PENS.lead);
  ink.push(dot(20, 74));

  // Transistor: a circle, base bar, collector and emitter legs, an arrow on the emitter.
  ring(ink, 148, 74, 21, PENS.lead);
  line(ink, [[124, 74], [140, 74]], PENS.lead);
  line(ink, [[140, 62], [140, 86]], PENS.lead);
  line(ink, [[140, 68], [158, 56], [158, 40]], PENS.lead);
  line(ink, [[140, 80], [158, 92], [158, 112]], PENS.lead);
  line(ink, [[150, 92], [158, 92], [154, 85]]);
  ground(158, 116);
  line(ink, [[158, 40], [214, 40], [214, 52]], PENS.lead);

  // A big chip with pins on every side and a shaded pin-1 corner.
  rect(ink, 214, 52, 110, 66, PENS.lead);
  for (let i = 0; i < 7; i++) {
    const x = 224 + i * 15;
    line(ink, [[x, 52], [x, 44]]);
    line(ink, [[x, 118], [x, 126]]);
  }
  for (let i = 0; i < 4; i++) {
    const y = 62 + i * 15;
    line(ink, [[324, y], [332, y]]);
  }
  ring(ink, 226, 64, 4);
  shade(ink, 266, 70, 312, 100, 4);
  rect(soft, 262, 66, 54, 38);

  // LED off the chip's corner: a triangle, a bar and two arrows of light.
  line(ink, [[332, 62], [350, 62], [350, 34]], PENS.lead);
  line(ink, [[340, 34], [360, 34], [350, 20]], PENS.lead, true);
  line(ink, [[340, 20], [360, 20]], PENS.lead);
  line(ink, [[364, 28], [376, 20]]);
  line(ink, [[371, 20], [376, 20], [375, 25]]);
  line(ink, [[364, 36], [376, 28]]);
  line(ink, [[371, 28], [376, 28], [375, 33]]);

  // Out of the chip: one trace round and back to the left edge, toward the title.
  line(ink, [[332, 107], [356, 107], [370, 120], [370, 132], [356, 142], [40, 142], [26, 128], [26, 112]], PENS.lead);
  ink.push(dot(26, 112));

  // ---------- Bottom: a crystal, a connector header, a heatsink and a battery ----------
  // Crystal between two plates, wired up toward the pins.
  line(ink, [[40, 530], [40, 560]], PENS.lead);
  line(ink, [[28, 560], [52, 560]], PENS.lead);
  rect(ink, 30, 566, 20, 16, PENS.lead);
  line(ink, [[28, 588], [52, 588]], PENS.lead);
  line(ink, [[40, 588], [40, 604]], PENS.lead);
  ground(40, 606);
  ink.push(dot(40, 530));

  // A three-trace bus fanning out toward the header.
  for (let i = 0; i < 3; i++) {
    const y = 630 + i * 12;
    line(soft, [[22, y], [118, y], [136, y - 18], [136, y - 66 + i * 8], [160, y - 90 + i * 8]]);
    soft.push(dot(22, y, 2.2));
  }

  // Connector header: a row of square pads with round holes, each wired down.
  rect(ink, 160, 532, 220, 26, PENS.lead);
  for (let i = 0; i < 8; i++) {
    const x = 166 + i * 27;
    rect(ink, x, 537, 16, 16);
    ring(ink, x + 8, 545, 3.6);
    if (i % 2 === 0) line(soft, [[x + 8, 558], [x + 8, 572], [x + 14, 578]]);
  }

  // Heatsink: a plate with shaded fins.
  rect(ink, 166, 596, 104, 18, PENS.lead);
  for (let i = 0; i < 7; i++) {
    const x = 170 + i * 14;
    rect(ink, x, 614, 8, 44);
    shade(ink, x + 1, 615, x + 7, 657, 3);
  }
  shade(ink, 168, 598, 268, 612, 4);

  // Battery: long and short plates, wired to the heatsink's plate and down to ground.
  line(ink, [[270, 605], [300, 605], [300, 618]], PENS.lead);
  for (let i = 0; i < 3; i++) {
    line(ink, [[284, 622 + i * 12], [316, 622 + i * 12]], PENS.lead);
    line(ink, [[292, 628 + i * 12], [308, 628 + i * 12]], PENS.frame);
  }
  line(ink, [[300, 658], [300, 664], [340, 664]], PENS.lead);
  ground(352, 650);
  line(ink, [[340, 664], [352, 664], [352, 650]], PENS.lead);

  // Diode on the header's right end, down toward the battery.
  line(ink, [[370, 558], [370, 584]], PENS.lead);
  line(ink, [[362, 584], [378, 584], [370, 598]], PENS.lead, true);
  line(ink, [[362, 598], [378, 598]], PENS.lead);
  line(ink, [[370, 598], [370, 616], [330, 616], [316, 622]], PENS.lead);

  // ---------- Vias scattered in the margins ----------
  const next = random(11);
  const zones = [
    [18, 26, 112, 56],
    [176, 120, 206, 136],
    [64, 528, 150, 556],
    [70, 540, 150, 600],
  ];
  for (let i = 0; i < 24; i++) {
    const [x0, y0, x1, y1] = zones[i % zones.length];
    via(x0 + next() * (x1 - x0), y0 + next() * (y1 - y0));
  }

  return { ink: ink.join(''), soft: soft.join('') };
}

export function DuoWallpaper() {
  const d = useMemo(draw, []);
  return (
    <svg className={'sdu-wallpaper'} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
      <path className={'sdu-wallpaper-soft'} d={d.soft} />
      <path className={'sdu-wallpaper-ink'} d={d.ink} />
    </svg>
  );
}
