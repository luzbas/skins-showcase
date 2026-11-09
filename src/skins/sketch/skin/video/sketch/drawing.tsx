/** @jsxImportSource react */

import { createContext, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';

import { cn } from '../../lib/resolve-class-name';

import { PENS, box, disc, hatch, loop, paper, random, scribble, seedOf, stroke, underline, type Point } from './pen';

const BOIL_INTERVAL = 125;

/** The current boil frame of the nearest hovered or focused control, or 0 when it is still. */
export const BoilContext = createContext(0);

function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Counts boil frames while the element (or its closest `selector` ancestor) is hovered or holds
 * focus, so its lines redraw by a fresh hand eight times a second. Still under reduced motion.
 */
export function useBoil(ref: RefObject<Element | null>, selector?: string) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const el = selector ? ref.current?.closest(selector) : ref.current;
    if (!el || prefersReducedMotion()) return;

    let timer = 0;
    let hovered = false;
    let focused = false;
    const update = () => {
      const hot = hovered || focused;
      if (hot && !timer) timer = window.setInterval(() => setFrame((f) => f + 1), BOIL_INTERVAL);
      if (!hot && timer) {
        window.clearInterval(timer);
        timer = 0;
        setFrame(0);
      }
    };
    // A tap is not a hover, and the focus a tap leaves behind is not keyboard focus: on touch screens both would
    // otherwise keep the control boiling (redrawing eight times a second) until something else is tapped.
    const enter = (event: Event) => { if ((event as PointerEvent).pointerType === 'touch') return; hovered = true; update(); };
    const leave = () => { hovered = false; update(); };
    const keyboardFocus = () => (el as HTMLElement).matches(':focus-visible, :has(:focus-visible)');
    const focusIn = () => { focused = keyboardFocus(); update(); };
    const focusOut = () => { requestAnimationFrame(() => { focused = keyboardFocus(); update(); }); };

    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('focusin', focusIn);
    el.addEventListener('focusout', focusOut);
    return () => {
      window.clearInterval(timer);
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('focusin', focusIn);
      el.removeEventListener('focusout', focusOut);
    };
  }, [ref, selector]);

  return frame;
}

/** The parent element's layout size, whole pixels, kept current as it resizes. */
function useParentSize(ref: RefObject<Element | null>) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;

    const measure = () => {
      const w = Math.round(parent.offsetWidth);
      const h = Math.round(parent.offsetHeight);
      setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function boiled(key: string, frame: number) {
  return seedOf(key) + (frame ? frame * 1.618 + 11 : 0);
}

/** A stable seed name per component instance. */
function useSeedKey(name?: string) {
  const id = useId();
  return name ?? id;
}

/** Unique, CSS-safe ids for masks. */
function useMaskId() {
  return `media-sketch-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

interface SurfaceProps {
  /**
   * A cut paper scrap, a round paper disc, a test pad (a disc with an inner ring), a chip with pin stubs on its sides,
   * or a connector with an inner frame.
   */
  shape?: 'paper' | 'disc' | 'pad' | 'chip' | 'connector';
  /** Keeps the same hand across instances, such as one per chapter of the time slider. */
  seedKey?: string;
  /** Draw the ink inside the box instead of past its edges, for parents that clip their content. */
  inset?: number;
  /** Draw the ink on when the surface opens, for menus and popovers. */
  draw?: boolean;
  /** Boil while this ancestor is hovered or focused, instead of the nearest control's boil. */
  boilOn?: string;
  className?: string;
}

/**
 * Paper behind a control or popup. Sized to its parent, which must be positioned; the parent's
 * own content paints above it.
 */
export function SketchSurface({ shape = 'paper', seedKey, inset = 0, draw = false, boilOn, className }: SurfaceProps) {
  const ref = useRef<SVGSVGElement>(null);
  const size = useParentSize(ref);
  const contextFrame = useContext(BoilContext);
  const ownFrame = useBoil(ref, boilOn);
  const frame = boilOn ? ownFrame : contextFrame;
  const key = useSeedKey(seedKey);
  const maskId = useMaskId();

  const geometry = useMemo(() => {
    if (!size || size.w < 2 || size.h < 2) return null;
    const w = size.w - inset * 2;
    const h = size.h - inset * 2;
    const seed = boiled(key, frame);
    if (shape === 'disc') return { ...disc(w, h, seed), center: '' };
    if (shape === 'pad') {
      const outer = disc(w, h, seed);
      const inner = stroke(loop(w / 2, h / 2, w * 0.4, h * 0.4, seed + 7, 12), PENS.hair, seed + 8);
      return { ...outer, ink: outer.ink + inner, center: '' };
    }
    const scrap = paper(w, h, seed);
    if (shape === 'chip') {
      const stubs = [0.28, 0.5, 0.72]
        .map((t, i) => stroke([[-7, h * t], [0, h * t]], PENS.hair, seed + i * 2.2) + stroke([[w, h * t], [w + 7, h * t]], PENS.hair, seed + i * 3.1))
        .join('');
      return { ...scrap, ink: scrap.ink + stubs };
    }
    if (shape === 'connector') return { ...scrap, ink: scrap.ink + stroke(box(4, 4, w - 8, h - 8, 1.5), PENS.hair, seed + 5, true) };
    return scrap;
  }, [size, inset, shape, key, frame]);

  const pad = inset ? 0 : shape === 'chip' ? 10 : 6;
  const w = (size?.w ?? 0) + pad * 2;
  const h = (size?.h ?? 0) + pad * 2;

  return (
    <svg
      ref={ref}
      className={cn('media-sketch-surface', className)}
      data-shape={shape}
      aria-hidden="true"
      focusable="false"
      width={w}
      height={h}
      viewBox={`${-pad - inset} ${-pad - inset} ${w} ${h}`}
      style={{ left: -pad, top: -pad }}
    >
      {geometry && (
        <>
          {draw && geometry.center && (
            <mask id={maskId} maskUnits="userSpaceOnUse">
              <path className={'media-sketch-draw'} d={geometry.center} pathLength={1} />
            </mask>
          )}
          <path className={'media-sketch-paper'} d={geometry.fill} />
          <path className={'media-sketch-ink'} d={geometry.ink} mask={draw && geometry.center ? `url(#${maskId})` : undefined} />
        </>
      )}
    </svg>
  );
}

/**
 * The loop drawn around a control: graphite on hover, red pencil for keyboard focus. CSS shows it
 * and draws it on; it boils with its control.
 */
export function SketchScribble({ seedKey, className }: { seedKey?: string; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const size = useParentSize(ref);
  const frame = useContext(BoilContext);
  const key = useSeedKey(seedKey);
  const maskId = useMaskId();

  const geometry = useMemo(
    () => (size && size.w > 2 ? scribble(size.w, size.h, boiled(key, frame), PENS.scribble) : null),
    [size, key, frame]
  );

  const pad = 6;
  return (
    <svg
      ref={ref}
      className={cn('media-sketch-scribble', className)}
      aria-hidden="true"
      focusable="false"
      width={(size?.w ?? 0) + pad * 2}
      height={(size?.h ?? 0) + pad * 2}
      viewBox={`${-pad} ${-pad} ${(size?.w ?? 0) + pad * 2} ${(size?.h ?? 0) + pad * 2}`}
      style={{ left: -pad, top: -pad }}
    >
      {geometry && (
        <>
          <mask id={maskId} maskUnits="userSpaceOnUse">
            <path className={'media-sketch-draw'} d={geometry.center} pathLength={1} />
          </mask>
          <path className={'media-sketch-scribble-ink'} d={geometry.ink} mask={`url(#${maskId})`} />
        </>
      )}
    </svg>
  );
}

/**
 * A menu item's marks: a red-pencil underline when highlighted, and the red focus loop for
 * keyboard focus. CSS decides which shows.
 */
export function SketchMark() {
  const ref = useRef<SVGSVGElement>(null);
  const size = useParentSize(ref);
  const key = useSeedKey();
  const maskId = useMaskId();

  const geometry = useMemo(() => {
    if (!size || size.w < 8) return null;
    const seed = seedOf(key);
    const lineWidth = Math.max(20, size.w - 24);
    const under = underline(lineWidth, seed);
    const ring = stroke(
      [[4, 2], [size.w - 4, 2.5], [size.w - 2, size.h - 3], [3, size.h - 2]],
      PENS.ring,
      seed + 5,
      true
    );
    return { under, ring, lineWidth };
  }, [size, key]);

  return (
    <svg
      ref={ref}
      className={'media-sketch-mark'}
      aria-hidden="true"
      focusable="false"
      width={size?.w ?? 0}
      height={size?.h ?? 0}
      viewBox={`0 0 ${size?.w ?? 0} ${size?.h ?? 0}`}
    >
      {geometry && size && (
        <>
          <mask id={maskId} maskUnits="userSpaceOnUse">
            <path className={'media-sketch-draw'} d={geometry.under.center} transform={`translate(12 ${size.h - 10})`} pathLength={1} />
          </mask>
          <path className={'media-sketch-underline'} d={geometry.under.ink} transform={`translate(12 ${size.h - 10})`} mask={`url(#${maskId})`} />
          <path className={'media-sketch-ring'} d={geometry.ring} />
        </>
      )}
    </svg>
  );
}

/**
 * A slider drawn in pencil: the line, buffered hatching and played hatching. The hatch layers are
 * drawn across the whole track once and revealed with clip paths that follow the slider's fill, so
 * lines never reshuffle as playback moves. The line boils while the slider is hovered or dragged.
 */
export function SketchTrack({
  orientation = 'horizontal',
  buffer = false,
  seedKey,
  boilOn,
}: {
  orientation?: 'horizontal' | 'vertical';
  buffer?: boolean;
  seedKey: string;
  boilOn: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const parent = useParentSize(ref);
  const frame = useBoil(ref, boilOn);
  const vertical = orientation === 'vertical';
  const band = 12;
  /* The drawing runs the parent's length and a fixed 24px across, centred on the parent. */
  const size = useMemo(
    () => (parent ? (vertical ? { w: 24, h: parent.h } : { w: parent.w, h: 24 }) : null),
    [parent, vertical]
  );

  const hatches = useMemo(() => {
    if (!size) return null;
    const length = vertical ? size.h : size.w;
    const mid = (vertical ? size.w : size.h) / 2;
    const played = vertical
      ? hatch(mid - band / 2, 0, mid + band / 2, length, 4.2, PENS.hatchTrack, seedOf(`${seedKey}-fill`))
      : hatch(0, mid - band / 2, length, mid + band / 2, 4.5, PENS.hatchTrack, seedOf(`${seedKey}-fill`));
    const buffered =
      buffer && !vertical
        ? hatch(0, mid - band / 2 + 1, length, mid + band / 2 - 1, 5.2, PENS.hatchTrack, seedOf(`${seedKey}-buffer`))
        : '';
    return { played, buffered };
  }, [size, vertical, buffer, seedKey]);

  const line = useMemo(() => {
    if (!size) return '';
    const seed = boiled(seedKey, frame);
    return vertical
      ? stroke([[size.w / 2, 0], [size.w / 2, size.h]], PENS.track, seed)
      : stroke([[0, size.h / 2], [size.w, size.h / 2]], PENS.track, seed);
  }, [size, vertical, seedKey, frame]);

  const layer = (className: string, d: string) => (
    <svg
      className={className}
      aria-hidden="true"
      focusable="false"
      width={size?.w ?? 0}
      height={size?.h ?? 0}
      viewBox={`0 0 ${size?.w ?? 0} ${size?.h ?? 0}`}
    >
      <path d={d} />
    </svg>
  );

  return (
    <span ref={ref} className={'media-sketch-track'} data-orientation={orientation} aria-hidden="true">
      {hatches && (
        <>
          {buffer && !vertical && layer('media-sketch-track-buffer', hatches.buffered)}
          {layer('media-sketch-track-line', line)}
          {layer('media-sketch-track-fill', hatches.played)}
        </>
      )}
    </span>
  );
}

/** The element's own layout size, whole pixels, kept current as it resizes. */
export function useOwnSize(ref: RefObject<Element | null>) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current as HTMLElement | null;
    if (!el) return;

    const measure = () => {
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function dotPath(x: number, y: number, r: number) {
  const f = (n: number) => Math.round(n * 100) / 100;
  return `M${f(x - r)} ${f(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
}

/**
 * A pencil trace across its own box: along the box's longer side, with a solder dot at its end.
 * Layouts place and size it with CSS, so the same trace joins a pad to the chip at any size.
 */
export function SketchLead({ className, dot = 'end' }: { className?: string; dot?: 'start' | 'end' | 'both' | 'none' }) {
  const ref = useRef<HTMLSpanElement>(null);
  const size = useOwnSize(ref);
  const key = useSeedKey();

  const d = useMemo(() => {
    if (!size || Math.max(size.w, size.h) < 2) return '';
    const vertical = size.h > size.w;
    const a: Point = vertical ? [size.w / 2, 0] : [0, size.h / 2];
    const b: Point = vertical ? [size.w / 2, size.h] : [size.w, size.h / 2];
    let out = stroke([a, b], PENS.lead, seedOf(key));
    if (dot === 'start' || dot === 'both') out += dotPath(a[0], a[1], 3);
    if (dot === 'end' || dot === 'both') out += dotPath(b[0], b[1], 3);
    return out;
  }, [size, key, dot]);

  return (
    <span ref={ref} className={cn('media-sketch-lead', className)} aria-hidden="true">
      <svg width={size?.w ?? 0} height={size?.h ?? 0} viewBox={`0 0 ${size?.w ?? 0} ${size?.h ?? 0}`} focusable="false">
        <path className={'media-sketch-ink'} d={d} />
      </svg>
    </span>
  );
}

/**
 * The chip outline around the video. It draws two versions and CSS shows one: the full package
 * (a heavy edge, an inner line and a row of pins along the top) for the board, and a hairline with
 * heavy corners for the fullscreen overlay.
 */
export function SketchFrame({ className }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const size = useOwnSize(ref);
  const key = useSeedKey('chip');

  const g = useMemo(() => {
    if (!size || size.w < 20 || size.h < 20) return null;
    const { w, h } = size;
    const seed = seedOf(key);
    const edge = (inset: number, pen: typeof PENS.frame, s: number) =>
      (
        [
          [[inset, inset], [w - inset, inset]],
          [[w - inset, inset], [w - inset, h - inset]],
          [[w - inset, h - inset], [inset, h - inset]],
          [[inset, h - inset], [inset, inset]],
        ] as Point[][]
      )
        .map((pts, i) => stroke(pts, pen, s + i * 1.7))
        .join('');

    const count = Math.max(6, Math.floor((w - 36) / 15));
    const pitch = (w - 36) / count;
    let pinPaper = '';
    let pinInk = '';
    for (let i = 0; i < count; i++) {
      const x = 18 + i * pitch + (pitch - 7) / 2;
      const pts = box(x, -15, 7, 13, 0.6);
      pinPaper += `M${pts.map((p) => p.join(' ')).join('L')}Z`;
      pinInk += stroke(pts, PENS.hair, seed + 40 + i * 0.37, true);
    }

    const corner = 34;
    const corners = (
      [
        [[0, corner], [0, 0], [corner, 0]],
        [[w - corner, 0], [w, 0], [w, corner]],
        [[w, h - corner], [w, h], [w - corner, h]],
        [[corner, h], [0, h], [0, h - corner]],
      ] as Point[][]
    )
      .map((pts, i) => stroke(pts, PENS.frame, seed + 80 + i))
      .join('');

    return {
      chip: edge(0, PENS.frame, seed) + edge(6, PENS.hair, seed + 20),
      pinPaper,
      pinInk,
      overlay: edge(0, PENS.hair, seed + 60) + corners,
    };
  }, [size, key]);

  return (
    <span ref={ref} className={cn('media-sketch-frame', className)} aria-hidden="true">
      <svg width={size?.w ?? 0} height={size?.h ?? 0} viewBox={`0 0 ${size?.w ?? 0} ${size?.h ?? 0}`} focusable="false">
        {g && (
          <>
            <g className={'media-sketch-frame-chip'}>
              <g className={'media-sketch-frame-pins'}>
                <path className={'media-sketch-paper'} d={g.pinPaper} />
                <path className={'media-sketch-ink'} d={g.pinInk} />
              </g>
              <path className={'media-sketch-ink'} d={g.chip} />
            </g>
            <g className={'media-sketch-frame-overlay'}>
              <path className={'media-sketch-ink'} d={g.overlay} />
            </g>
          </>
        )}
      </svg>
    </span>
  );
}

/**
 * A slider drawn as a row of chip pins: paper pins with pencil outlines, buffered ones hatched,
 * played ones filled with red pencil. The three layers are drawn once and revealed with clip paths
 * that follow the slider's fill, so pins never reshuffle as playback moves.
 */
export function SketchPins({ seedKey, count, buffer = false }: { seedKey: string; count?: number; buffer?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const size = useOwnSize(ref);

  const g = useMemo(() => {
    if (!size || size.w < 10 || size.h < 4) return null;
    const { w, h } = size;
    const n = count ?? Math.max(8, Math.round(w / 15));
    const pitch = w / n;
    const pinW = Math.min(count ? pitch - 6 : 9, pitch * 0.62);
    const seed = seedOf(seedKey);
    const next = random(seed);
    let fill = '';
    let ink = '';
    let hatching = '';
    let redHatching = '';
    for (let i = 0; i < n; i++) {
      const x = i * pitch + (pitch - pinW) / 2 + (next() - 0.5) * 0.8;
      const pts = box(x, 0.5, pinW, h - 1, 0.6);
      fill += `M${pts.map((p) => p.map((v) => Math.round(v * 100) / 100).join(' ')).join('L')}Z`;
      ink += stroke(pts, PENS.hair, seed + i * 0.37, true);
      if (buffer) hatching += hatch(x, 1, x + pinW, h - 1, 2, PENS.hatchIcon, seed + 50 + i);
      redHatching += hatch(x, 1, x + pinW, h - 1, 1.6, PENS.hatchIcon, seed + 90 + i);
    }
    return { fill, ink, hatching, redHatching };
  }, [size, seedKey, count, buffer]);

  const layer = (className: string, children: ReactNode) => (
    <svg className={className} width={size?.w ?? 0} height={size?.h ?? 0} viewBox={`0 0 ${size?.w ?? 0} ${size?.h ?? 0}`} focusable="false">
      {children}
    </svg>
  );

  return (
    <span ref={ref} className={'media-sketch-pins'} aria-hidden="true">
      {g && (
        <>
          {layer('media-sketch-pins-base', <><path className={'media-sketch-paper'} d={g.fill} /><path className={'media-sketch-ink'} d={g.ink} /></>)}
          {buffer && layer('media-sketch-pins-buffer', <path className={'media-sketch-pins-hatch'} d={g.hatching} />)}
          {layer('media-sketch-pins-played', <><path className={'media-sketch-paper'} d={g.fill} /><path className={'media-sketch-pins-red'} d={g.redHatching} /><path className={'media-sketch-pins-red-ink'} d={g.ink} /></>)}
        </>
      )}
    </span>
  );
}
