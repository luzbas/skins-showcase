/** @jsxImportSource react */

// The closed phone's upright outer display (Horizontal · Closed) has room above the title and below the timeline.
// This fills it with a general cut-paper wallpaper of primitive shapes (circles, half-discs, squares, triangles,
// bars) in the skin's own paper colours, with wobbly scissor edges and a soft paper shadow. Not tied to any video.
// Purely decorative (aria-hidden), no text or numbers. Only shown on that layout; see "Outer · portrait wallpaper"
// in duo.css.
//
// The viewBox is the display's leading side in points (393 × 678: the 466 pt display minus the 73 pt rail), so one
// unit is one point and the bands line up with the layout: the title starts at 151 pt and the timeline ends at 526 pt.

type Kind = 'circle' | 'half' | 'square' | 'triangle' | 'bar';

interface Shape {
  kind: Kind;
  x: number;
  y: number;
  /** Radius for circles and half-discs, side for squares, circumradius for triangles, length for bars. */
  size: number;
  rotate?: number;
  className: string;
  /** Wiggles (squares, triangles, bars) or drifts (circles). Big anchor pieces stay put. */
  still?: boolean;
  /** Animation offset, so the pieces don't move together. */
  delay?: number;
}

/** Drawn in order: big anchor pieces first, small confetti on top. */
const SHAPES: Shape[] = [
  // ---------- Top band (0–140 pt) ----------
  { kind: 'circle', x: -18, y: 34, size: 60, className: 'pcw-cream', still: true },
  { kind: 'half', x: 214, y: -2, size: 46, className: 'pcw-yellow', still: true },
  { kind: 'square', x: 350, y: 44, size: 56, rotate: 15, className: 'pcw-blue', delay: 0.4 },
  { kind: 'triangle', x: 128, y: 102, size: 24, rotate: -10, className: 'pcw-green', delay: 1.6 },
  { kind: 'bar', x: 72, y: 82, size: 46, rotate: -8, className: 'pcw-orange', delay: 0.9 },
  { kind: 'half', x: 202, y: 132, size: 15, className: 'pcw-blue', delay: 2.1 },
  { kind: 'circle', x: 286, y: 96, size: 11, className: 'pcw-red', delay: 0.3 },
  { kind: 'circle', x: 310, y: 124, size: 6, className: 'pcw-red', delay: 1.4 },
  { kind: 'circle', x: 262, y: 128, size: 4, className: 'pcw-cream', delay: 2.2 },
  { kind: 'square', x: 238, y: 32, size: 10, rotate: 20, className: 'pcw-cream', delay: 0.5 },
  { kind: 'triangle', x: 30, y: 126, size: 7, rotate: -30, className: 'pcw-red', delay: 2.4 },
  { kind: 'circle', x: 168, y: 40, size: 5, className: 'pcw-yellow', delay: 1.2 },

  // ---------- Bottom band (535–678 pt) ----------
  { kind: 'triangle', x: 44, y: 664, size: 70, className: 'pcw-green', still: true },
  { kind: 'triangle', x: 112, y: 676, size: 48, rotate: 8, className: 'pcw-green-deep', still: true },
  { kind: 'circle', x: 378, y: 670, size: 58, className: 'pcw-red', still: true },
  { kind: 'square', x: 292, y: 624, size: 40, rotate: -14, className: 'pcw-blue', delay: 2.0 },
  { kind: 'circle', x: 198, y: 618, size: 21, className: 'pcw-yellow', delay: 0.6 },
  { kind: 'bar', x: 156, y: 570, size: 50, rotate: 6, className: 'pcw-cream', delay: 1.1 },
  { kind: 'half', x: 214, y: 678, size: 26, rotate: 180, className: 'pcw-orange', still: true },
  { kind: 'triangle', x: 108, y: 600, size: 8, rotate: -12, className: 'pcw-orange', delay: 1.5 },
  { kind: 'square', x: 334, y: 572, size: 10, rotate: 24, className: 'pcw-yellow', delay: 0.8 },
  { kind: 'circle', x: 244, y: 560, size: 5, className: 'pcw-cream', delay: 0.2 },
  { kind: 'circle', x: 152, y: 640, size: 7, className: 'pcw-cream', delay: 1.8 },
  { kind: 'circle', x: 40, y: 568, size: 4, className: 'pcw-cream', delay: 2.1 },
];

/** The shape itself, centred on (0, 0) before it's placed. */
function geometry({ kind, size, className }: Shape) {
  switch (kind) {
    case 'circle':
      return <circle className={className} r={size} />;
    case 'half':
      // Flat edge along y = 0, round side down; rotate 180 to point it up.
      return <path className={className} d={`M${-size},0 A${size},${size} 0 0 0 ${size},0 Z`} />;
    case 'square':
      return <rect className={className} x={-size / 2} y={-size / 2} width={size} height={size} rx={size * 0.06} />;
    case 'triangle': {
      const h = size * 0.866;
      return <path className={className} d={`M0,${-size} L${h},${size / 2} L${-h},${size / 2} Z`} />;
    }
    case 'bar':
      return <rect className={className} x={-size / 2} y={-size * 0.12} width={size} height={size * 0.24} rx={size * 0.12} />;
  }
}

export function DuoWallpaper() {
  return (
    <svg className={'pcd-wallpaper'} viewBox="0 0 393 678" aria-hidden="true" focusable="false">
      <defs>
        {/* Scissor edge plus the paper's shadow, in one pass. */}
        <filter id="pcw-paper" x="-20%" y="-20%" width="140%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves={2} seed={4} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={3} xChannelSelector="R" yChannelSelector="G" result="cut" />
          <feDropShadow in="cut" dx="0" dy="2" stdDeviation="1.2" floodColor="#140810" floodOpacity="0.55" />
        </filter>
      </defs>

      <g filter="url(#pcw-paper)">
        {SHAPES.map((shape) => (
          <g key={`${shape.kind}${shape.x}-${shape.y}`} transform={`translate(${shape.x} ${shape.y}) rotate(${shape.rotate ?? 0})`}>
            <g
              className={shape.still ? undefined : shape.kind === 'circle' ? 'pcw-drift' : 'pcw-wiggle'}
              style={shape.still ? undefined : { animationDelay: `${shape.delay ?? 0}s` }}
            >
              {geometry(shape)}
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}
