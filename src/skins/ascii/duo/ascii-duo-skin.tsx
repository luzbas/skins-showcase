/** @jsxImportSource react */

'use client';

// ASCII Glitch · Duo — the ASCII skin's schematic board laid out for the iPhone Duo. Same three situations as
// Papercut · Duo and Sketch · Duo, chosen the same way (from the device posture and viewport segments, see src/foldable):
//   split    propped up on a table: the picture on the top half (glyphs while paused), a terminal board of units on
//            the bottom half — header, transport, timeline and a row of keys, wired together; nothing on the crease
//   full     a flat screen: the picture edge to edge, the units over it, stepping away while playing
//   outer-*  the closed phone's outer display: the picture as a feed unit, a rail of keys on the trailing edge
// Chapters and settings open as panels that scroll inside themselves (a fullscreen or propped-up phone can't scroll).
// It reuses the ASCII skin's controls from ../skin and the schematic layout's chapter index and settings groups from
// ../schematic, and lives outside ../skin because `npm run sync-skin -- ascii` replaces ../skin wholesale.
import { Controls, Gesture, PlayButton as PlayButtonPrimitive, Time, usePlayer } from '@videojs/react';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/react/icons';
import { selectControls } from '@videojs/core/dom';
import { useContext, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { foldableAttributes, useFoldable } from '../../../duo-kit/foldable';
import { SimulatedFullscreen, duoLayoutFor, useFullscreenOrientationLock } from '../../../duo-kit/duo-shared';
import { AsciiFonts } from '../skin/ui/ascii-fonts';
import { BufferingIndicator } from '../skin/ui/buffering-indicator';
import { Button } from '../skin/ui/button';
import { CaptionsButton } from '../skin/ui/captions-button';
import { Container } from '../skin/ui/container';
import { ErrorDialog } from '../skin/ui/error-dialog';
import { FullscreenButton } from '../skin/ui/fullscreen-button';
import { MuteButton } from '../skin/ui/mute-button';
import { Poster } from '../skin/ui/poster';
import { PlayButton } from '../skin/ui/play-button';
import { SeekButton } from '../skin/ui/seek-button';
import { TimeSlider } from '../skin/ui/time-slider';
import { VideoHotkeys } from '../skin/video/behaviors/hotkeys';
import { AsciiCaptions } from '../skin/video/display/ascii-captions';
import { AsciiScreen } from '../skin/video/display/ascii-screen';
import { AsciiStage } from '../skin/video/display/ascii-stage';
import { VideoStatusIndicators } from '../skin/video/display/status-indicators';
import { cn } from '../skin/lib/resolve-class-name';
import { ChapterIndex, SettingsGroups, useChapters } from '../schematic/schematic-skin';
// The ASCII skin's look first, then this layout's, so its layer is declared after (see the top of duo.css).
import '../skin/styles/video/base.css';
import '../skin/styles/ascii.css';
import './duo.css';

type Panel = 'chapters' | 'settings' | null;

/* ---------- Wallpaper: a glitched ASCII noise field ---------- */

/** Cell size (pt) of the wallpaper's glyph grid, matching the outer display's 393 × 678 pt drawing. */
const WP_CW = 9;
const WP_CH = 12;
const WP_COLS = Math.ceil(393 / WP_CW);
const WP_ROWS = Math.ceil(678 / WP_CH);

/** Seeded random (mulberry32), so the field is the same on every render and every load. */
function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 2-D value noise on a lattice of `step` cells, 0..1. */
function valueNoise(rand: () => number, cols: number, rows: number, step: number) {
  const lw = Math.ceil(cols / step) + 2;
  const lh = Math.ceil(rows / step) + 2;
  const lattice = Array.from({ length: lw * lh }, rand);
  const at = (x: number, y: number) => lattice[y * lw + x];
  const smooth = (v: number) => v * v * (3 - 2 * v);
  return (c: number, r: number) => {
    const x = c / step;
    const y = r / step;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
    const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
    return top * (1 - fy) + bottom * fy;
  };
}

/**
 * How much of the field shows at a point (pt), 0..1: thick at the top and bottom edges of the outer display, thinning
 * out towards the title, the feed and the timeline, and nothing over them.
 */
function wallpaperWeight(x: number, y: number) {
  if (y < 128) return Math.pow(1 - y / 128, 0.8);
  if (y < 232) {
    // Beside and under the title block: only the right side, and a faint strip just above the feed.
    const right = x > 256 ? ((x - 256) / 137) * 0.75 : 0;
    const strip = y > 200 ? 0.18 : 0;
    return Math.max(right, strip);
  }
  if (y > 540) return Math.pow((y - 540) / 138, 0.8);
  return 0;
}

/** Glyph ids, from faint to dense, plus the accents. */
const RAMP = ['dot', 'colon', 'shade1', 'shade2', 'shade3', 'full'] as const;
type Glyph = (typeof RAMP)[number] | 'cross' | 'ex' | 'upper' | 'lower' | 'double';

type Cell = { c: number; r: number; glyph: Glyph; flick?: number };
type Tear = { r: number; shift: number; delay: number; cells: Cell[] };

/** The field, worked out once: the cells, the rows that tear, and a few corrupted macroblocks. */
const WALLPAPER = (() => {
  const rand = seeded(0x5c11);
  const broad = valueNoise(rand, WP_COLS, WP_ROWS, 7);
  const fine = valueNoise(rand, WP_COLS, WP_ROWS, 2);
  const cells: Cell[] = [];
  for (let r = 0; r < WP_ROWS; r++) {
    for (let c = 0; c < WP_COLS; c++) {
      const x = (c + 0.5) * WP_CW;
      const y = (r + 0.5) * WP_CH;
      const weight = wallpaperWeight(x, y);
      if (weight <= 0) continue;
      const level = weight * 0.82 + (broad(c, r) - 0.5) * 0.9 + (fine(c, r) - 0.5) * 0.35 - 0.12;
      if (level <= 0.06) continue;
      const index = Math.min(RAMP.length - 1, Math.floor(level * RAMP.length));
      let glyph: Glyph = RAMP[index];
      const roll = rand();
      if (index >= 1 && index <= 3 && roll < 0.05) glyph = roll < 0.025 ? 'cross' : 'ex';
      else if (index >= 4 && roll < 0.08) glyph = roll < 0.04 ? 'upper' : 'lower';
      else if (index === 2 && roll < 0.1) glyph = 'double';
      cells.push({ c, r, glyph, flick: rand() < 0.035 ? +(rand() * 4).toFixed(2) : undefined });
    }
  }

  // Rows that tear sideways now and then, carrying their cells with them.
  const tearRows = [1, 4, 7, 9, 46, 49, 51, 54];
  const tears: Tear[] = tearRows.map((r, i) => ({
    r,
    shift: (i % 2 ? -1 : 1) * (2 + Math.floor(rand() * 3)) * WP_CW,
    delay: +(rand() * 5).toFixed(2),
    cells: cells.filter((cell) => cell.r === r),
  }));
  const still = cells.filter((cell) => !tearRows.includes(cell.r));

  // Corrupted macroblocks: small blocks of half-block dither, knocked out of line.
  const blocks: [number, number, number, number, string][] = [
    [3, 2, 5, 2, '#ff6236'],
    [31, 6, 4, 1, '#b9dc5a'],
    [36, 15, 3, 2, '#ff6236'],
    [6, 47, 4, 2, '#b9dc5a'],
    [27, 52, 6, 1, '#ff6236'],
  ];
  return { still, tears, blocks };
})();

const glyphHref = (glyph: Glyph) => `#adu-wp-${glyph}`;

function GlyphCells({ cells }: { cells: Cell[] }) {
  return (
    <>
      {cells.map(({ c, r, glyph, flick }) => (
        <use
          key={`${c}-${r}`}
          href={glyphHref(glyph)}
          x={c * WP_CW}
          y={r * WP_CH}
          className={flick !== undefined ? 'adu-flick' : undefined}
          style={flick !== undefined ? { animationDelay: `${flick}s` } : undefined}
        />
      ))}
    </>
  );
}

/**
 * The closed phone's portrait outer display has room above the title and under the timeline: a wallpaper fills it
 * with the skin's own language — an ASCII noise field in block glyphs, densest at the edges and fading towards the
 * controls, with rows that tear sideways in RGB-split ghosts, corrupted macroblocks, flickering cells and a rolling
 * scanline. Abstract on purpose (no text, no numbers, nothing tied to the video); decorative only (duo.css shows it
 * on the outer portrait layout alone).
 */
function DuoWallpaper() {
  const { still, tears, blocks } = WALLPAPER;
  return (
    <svg className={'adu-wallpaper'} viewBox="0 0 393 678" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        {/* Shade fills, aligned to one page-wide grid so neighbouring cells read as one dither. */}
        <pattern id="adu-wp-p1" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="1" height="1" fill="#ffb22e" />
        </pattern>
        <pattern id="adu-wp-p2" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="1" height="1" fill="#ffb22e" />
          <rect x="1" y="1" width="1" height="1" fill="#ffb22e" />
        </pattern>
        <pattern id="adu-wp-p3" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="2" height="1" fill="#ffb22e" />
          <rect y="1" width="1" height="1" fill="#ffb22e" />
        </pattern>
        <pattern id="adu-wp-scan" width="4" height="3" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#000" fillOpacity="0.35" />
        </pattern>
        <linearGradient id="adu-wp-band" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb22e" stopOpacity="0" />
          <stop offset="0.8" stopColor="#ffb22e" stopOpacity="0.14" />
          <stop offset="1" stopColor="#fff0d6" stopOpacity="0.3" />
        </linearGradient>

        {/* The glyphs, one cell (9 × 12 pt) each. */}
        <rect id="adu-wp-dot" x="3.6" y="5.4" width="1.8" height="1.8" fill="#fff0d6" fillOpacity="0.45" />
        <g id="adu-wp-colon" fill="#fff0d6" fillOpacity="0.55">
          <rect x="3.6" y="2.8" width="1.8" height="1.8" />
          <rect x="3.6" y="7.6" width="1.8" height="1.8" />
        </g>
        <rect id="adu-wp-shade1" x="0.5" y="0.5" width="8" height="11" fill="url(#adu-wp-p1)" />
        <rect id="adu-wp-shade2" x="0.5" y="0.5" width="8" height="11" fill="url(#adu-wp-p2)" />
        <rect id="adu-wp-shade3" x="0.5" y="0.5" width="8" height="11" fill="url(#adu-wp-p3)" />
        <rect id="adu-wp-full" x="0.5" y="0.5" width="8" height="11" fill="#ffb22e" fillOpacity="0.6" />
        <rect id="adu-wp-upper" x="0.5" y="0.5" width="8" height="5.5" fill="#ff6236" fillOpacity="0.75" />
        <rect id="adu-wp-lower" x="0.5" y="6" width="8" height="5.5" fill="#ff6236" fillOpacity="0.75" />
        <path id="adu-wp-cross" d="M4.5 1 V11 M0.5 6 H8.5" stroke="#b9dc5a" strokeWidth="1.2" fill="none" />
        <path id="adu-wp-ex" d="M1 2 L8 10 M8 2 L1 10" stroke="#b9dc5a" strokeWidth="1.2" fill="none" />
        <path id="adu-wp-double" d="M0.5 4.5 H8.5 M0.5 7.5 H8.5" stroke="#ffb22e" strokeWidth="1.2" fill="none" />
      </defs>

      <GlyphCells cells={still} />

      {/* Tearing rows: the row slides out of line, trailing a terra and a sage ghost (the RGB split). */}
      {tears.map(({ r, shift, delay, cells }) => (
        <g key={r} className={'adu-tear'} style={{ animationDelay: `${delay}s`, ['--tear' as string]: `${shift}px` }}>
          {cells.length > 0 && (() => {
            // The ghosts only span the row's own glyphs.
            const from = Math.min(...cells.map((cell) => cell.c)) * WP_CW;
            const to = (Math.max(...cells.map((cell) => cell.c)) + 1) * WP_CW;
            return (
              <>
                <rect x={from + 3} y={r * WP_CH + 3} width={to - from} height="1.4" fill="#ff6236" fillOpacity="0.45" />
                <rect x={from - 3} y={r * WP_CH + 7.5} width={to - from} height="1.4" fill="#b9dc5a" fillOpacity="0.35" />
              </>
            );
          })()}
          <GlyphCells cells={cells} />
        </g>
      ))}

      {/* Corrupted macroblocks. */}
      {blocks.map(([c, r, w, h, color]) => (
        <g key={`${c}-${r}`} className={'adu-flick'} style={{ animationDelay: `${(c % 5) * 0.6}s` }}>
          <rect x={c * WP_CW + 4} y={r * WP_CH} width={w * WP_CW} height={h * WP_CH} fill="#150d08" />
          {Array.from({ length: w * h }, (_, i) => (
            <rect
              key={i}
              x={(c + (i % w)) * WP_CW + 4 + 0.5}
              y={(r + Math.floor(i / w)) * WP_CH + ((i + r) % 2 ? 0.5 : 6)}
              width={WP_CW - 1}
              height={5.5}
              fill={color}
              fillOpacity={0.7}
            />
          ))}
        </g>
      ))}

      {/* Scanlines over everything, and a slow bright band rolling down. */}
      <rect width="393" height="678" fill="url(#adu-wp-scan)" />
      <rect className={'adu-roll'} x="0" y="-24" width="393" height="24" fill="url(#adu-wp-band)" />
    </svg>
  );
}

/** A key on the board, with its label printed under it (hidden where there's no room). */
function Key({ name, label, children }: { name: string; label: string; children: ReactNode }) {
  return (
    <div className={cn('adu-key', `adu-key-${name}`)}>
      {children}
      <span className={'adu-key-label'} aria-hidden="true">
        {label}
      </span>
    </div>
  );
}

/** Real fullscreen on a page; inside the Duo mockup, the simulation's own (it turns the drawn phone). */
function DuoFullscreenKey() {
  const simulated = useContext(SimulatedFullscreen);
  if (!simulated) return <FullscreenButton />;
  return (
    <Button
      type="button"
      className={'media-fullscreen-button'}
      data-fullscreen={simulated.active ? '' : undefined}
      aria-label={simulated.active ? 'Exit fullscreen' : 'Enter fullscreen'}
      onClick={simulated.toggle}
    >
      {simulated.active ? (
        <FullscreenExitIcon className={'media-button-icon'} />
      ) : (
        <FullscreenEnterIcon className={'media-button-icon'} />
      )}
    </Button>
  );
}

/** A key that opens one of the panels. */
function PanelKey({ panel, open, label, onToggle, children }: { panel: Exclude<Panel, null>; open: boolean; label: string; onToggle: (panel: Exclude<Panel, null>) => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className={cn('media-button', 'adu-panel-key', open && 'is-open')}
      aria-label={label}
      aria-expanded={open}
      onClick={() => onToggle(panel)}
    >
      {children}
    </button>
  );
}

/** Chapters or settings: a terminal window that scrolls inside itself. */
function PanelWindow({ open, title, label, onClose, children }: { open: boolean; title: string; label: string; onClose: () => void; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  };
  return (
    <div className={'adu-panel'} role="dialog" aria-label={label} hidden={!open} onKeyDown={onKeyDown}>
      <div className={'adu-panel-head'}>
        <p className={'adu-tab'} aria-hidden="true">
          ▌{title}
        </p>
        <button ref={closeRef} type="button" className={'adu-panel-close'} aria-label={`Close ${label.toLowerCase()}`} onClick={onClose}>
          ✕
        </button>
      </div>
      <div className={'adu-panel-body'}>{children}</div>
    </div>
  );
}

export interface AsciiDuoSkinProps {
  children?: ReactNode;
  title?: string;
  className?: string;
}

export function AsciiDuoSkin({ children, className, title = 'Signal' }: AsciiDuoSkinProps) {
  const ref = useRef<HTMLDivElement>(null);
  const foldable = useFoldable(ref);
  const { style: segmentStyle, ...foldAttributes } = foldableAttributes(foldable);
  const layout = duoLayoutFor(foldable);
  const simulatedFullscreen = useContext(SimulatedFullscreen);
  const outerFullscreen = layout.startsWith('outer') && (simulatedFullscreen?.active ?? false);
  // Propped up in the simulation the phone is its own little screen: no fullscreen key there. On a real Duo the split
  // layout only appears in fullscreen, where the key is the way out, so it stays.
  const noFullscreen = layout === 'split' && foldable.simulated;
  // The overlay layouts hide while playing; a tap shows them (touch), a pointer move too (mouse).
  const overlay = layout === 'full' || outerFullscreen;
  useFullscreenOrientationLock(ref, foldable.fullscreen);

  const { cues, active } = useChapters();
  const chapter = active >= 0 ? cues[active]?.text : null;

  const [panel, setPanel] = useState<Panel>(null);
  const togglePanel = (next: Exclude<Panel, null>) => setPanel((current) => (current === next ? null : next));
  const closePanel = () => setPanel(null);
  // A layout change closes a panel: it belongs to the layout it was opened in.
  useEffect(() => setPanel(null), [layout]);
  // Keep the overlay up while a panel is open.
  const requestLock = usePlayer(selectControls)?.requestControlsLock;
  useEffect(() => {
    if (!panel || !requestLock) return undefined;
    return requestLock();
  }, [panel, requestLock]);

  return (
    <Container
      className={cn('ascii-skin', 'ascii-duo', className)}
      data-theme="default"
      data-layout={`duo-${layout}`}
      data-outer-fullscreen={outerFullscreen ? '' : undefined}
      data-panel={panel ?? undefined}
      {...foldAttributes}
      style={segmentStyle}
    >
      <AsciiFonts />

      <DuoWallpaper />

      {/* ---------- The picture: the top segment when split, the whole screen when flat, a feed unit when closed ---------- */}
      <div ref={ref} className={'adu-top'}>
        <p className={'adu-feed-tab'} aria-hidden="true">
          ▌INPUT CH: 00 // FEED
        </p>
        <div className={'adu-video'}>
          {children}
          {/* The poster (the stream's thumbnail) until playback starts, sized to the picture's box. */}
          <Poster />
          <AsciiScreen />
          {/* Click the picture to play or pause (mouse); the transport's button is the one in the tab order. */}
          <PlayButtonPrimitive className={'adu-surface'} tabIndex={-1} aria-hidden="true" />
          <AsciiCaptions />
          <AsciiStage />
          <BufferingIndicator />
          <VideoStatusIndicators />
        </div>
      </div>

      {/* The fold: a dashed rule across the board's top edge. Nothing interactive sits on it. */}
      <div className={'adu-crease'} aria-hidden="true">
        <span>[FOLD]</span>
      </div>

      {/* Outer display only: the trailing rail and the camera at its top. */}
      <div className={'adu-rail'} aria-hidden="true" />
      <div className={'adu-camera'} aria-hidden="true" />

      {/* ---------- The board ---------- */}
      <Controls.Root>
        <Controls.Content className={cn('video-controls', 'adu-board')} role="group" aria-label="Player controls">
          <div className={'adu-head'}>
            <p className={'adu-title'}>
              {title.toUpperCase().replace(/\s+/g, '_')}
              <span className={'ax-cursor'} aria-hidden="true">
                _
              </span>
            </p>
            <p className={'adu-sub'}>&gt; {chapter ? `ch: ${chapter}` : 'signal acquired'}</p>
            <p className={'adu-status'} aria-hidden="true">
              P_NODE=DUO · STATUS: <span className={'adu-st-play'}>PLAYING</span>
              <span className={'adu-st-pause'}>PAUSED</span>
            </p>
          </div>

          <div className={cn('adu-unit', 'adu-transport')} role="group" aria-label="Transport">
            <p className={'adu-tab'} aria-hidden="true">
              ▌UNIT: TRANSPORT
            </p>
            <div className={'adu-transport-keys'}>
              <SeekButton seconds={-10} />
              <PlayButton className={'adu-play'} />
              <SeekButton seconds={10} />
            </div>
          </div>

          <div className={cn('adu-unit', 'adu-timeline')} role="group" aria-label="Timeline">
            <p className={'adu-tab'} aria-hidden="true">
              ▌RECORD: 91-A // TIMELINE
            </p>
            <div className={'adu-timeline-row'}>
              <Time.Value className={cn('media-time-value', 'adu-time')} type="current" />
              <TimeSlider />
              <Time.Value className={cn('media-time-toggle', 'adu-time')} type="remaining" toggle />
            </div>
          </div>

          <div className={'adu-keys'} role="group" aria-label="Options">
            <Key name="mute" label="MUTE">
              <MuteButton />
            </Key>
            {/* Hides itself (data-hidden) when the media has no captions; the row closes up. */}
            <Key name="captions" label="CC">
              <CaptionsButton />
            </Key>
            <Key name="chapters" label="CH">
              <PanelKey panel="chapters" open={panel === 'chapters'} label="Chapters" onToggle={togglePanel}>
                <span className={'adu-glyph'} aria-hidden="true">
                  ≡
                </span>
              </PanelKey>
            </Key>
            <Key name="settings" label="CFG">
              <PanelKey panel="settings" open={panel === 'settings'} label="Settings" onToggle={togglePanel}>
                <svg className={'media-button-icon'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
                  <rect x="14" y="5" width="4" height="4" />
                  <rect x="6" y="15" width="4" height="4" />
                </svg>
              </PanelKey>
            </Key>
            {noFullscreen ? null : (
              <Key name="fullscreen" label="FULL">
                <DuoFullscreenKey />
              </Key>
            )}
          </div>

          {/* Wires between the units (split board only), with their labels. */}
          <span className={cn('adu-wire', 'adu-wire-a')} aria-hidden="true">
            [T1]
          </span>
          <span className={cn('adu-wire', 'adu-wire-b')} aria-hidden="true">
            [TL]
          </span>
          <span className={cn('adu-wire', 'adu-wire-c')} aria-hidden="true">
            [J1–J5]
          </span>

          {/* ---------- Panels: inside the board, which already covers where each should go (the bottom half when
              split, the screen when flat, left of the rail when closed). Being on the board's layer is also what
              lets the propped-up phone's tilted 3D scene find their buttons. ---------- */}
          <PanelWindow open={panel === 'chapters'} title="Index: chapters" label="Chapters" onClose={closePanel}>
            <ChapterIndex onPick={closePanel} />
          </PanelWindow>
          <PanelWindow open={panel === 'settings'} title="Data cluster: config" label="Settings" onClose={closePanel}>
            <SettingsGroups />
          </PanelWindow>
        </Controls.Content>
      </Controls.Root>

      {/* Tapping the picture beside an open panel closes it. */}
      {panel ? <button type="button" className={'adu-scrim'} tabIndex={-1} aria-hidden="true" onClick={closePanel} /> : null}

      {/* Touch, over the overlay layouts: a tap shows or hides the units, a double-tap on either side skips 10s. */}
      <Gesture disabled={!overlay} type="tap" action="toggleControls" pointer="touch" />
      <Gesture disabled={!overlay} type="doubletap" action="seekStep" region="left" pointer="touch" />
      <Gesture disabled={!overlay} type="doubletap" action="seekStep" region="right" pointer="touch" />

      <ErrorDialog />
      <VideoHotkeys />
    </Container>
  );
}
