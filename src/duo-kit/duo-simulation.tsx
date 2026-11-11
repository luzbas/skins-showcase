/** @jsxImportSource react */

'use client';

// iPhone Duo fold simulation, shared by every skin's Duo layout. Poses are picked by category: Horizontal and Vertical (each
// Open or Closed) and Table (propped up, vertical; seen angled, or tilted so its top or bottom half faces you). Every change is animated as one sequence: fold flat or shut if
// needed, turn, then fold into the new pose. The device is cut from card in CSS 3D. The live player sits on whichever display
// faces you and never stops playing while the phone moves (the kit's continuity rule).
//
// The simulation doesn't tell the player which layout to use. It feeds the same values a real foldable reports
// (device posture + viewport segments, see src/foldable) through <SimulatedFoldable>, and the skin picks its layout
// from those, exactly as it would on an iPhone Duo.
//
// Geometry is in "device units" (--u): 1u is one inner-display point, so the open device is 890 × 626 pt of screen
// inside a 22 u bezel. Loosely after jadon7/iphone-duo (MIT); no Apple assets are used.
import './simulation.css';
import { HlsVideo } from '@videojs/react/media/hls-video';
import { VideoPlayer } from '@videojs/react/video';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { SimulatedFoldable, type SimulatedFoldableValue } from './foldable';
import { SimulatedFullscreen, fullscreenOrientationFor, type SimulatedFullscreenValue } from './duo-shared';

type Orientation = 'vertical' | 'horizontal';
type Category = Orientation | 'table';
type Fold = 'open' | 'closed';
/** How a propped-up phone is seen: from three quarters, or tilted so one half faces you square-on. */
type View = 'angled' | 'top' | 'bottom';
/**
 * What the user picked. Horizontal and Vertical use `fold`, Table uses `view`; each remembers its last choice for when
 * the user comes back to it.
 */
interface Selection {
  category: Category;
  fold: Fold;
  view: View;
}
interface Pose {
  orientation: Orientation;
  angle: number;
  /** How the phone is tilted toward you: 0 angled, 1 top half square-on, -1 bottom half square-on. */
  look: number;
}

/** Device size in u. Horizontal: hinge runs top to bottom; vertical: the same phone turned a quarter turn. */
const DEVICE = { horizontal: { w: 934, h: 670 }, vertical: { w: 670, h: 934 } } as const;
/** Inner display size in u (= pt), per orientation. */
const INNER = { horizontal: { w: 890, h: 626 }, vertical: { w: 626, h: 890 } } as const;
const OPEN = 180;
const CLOSED = 0;
const TABLETOP = 105;
/** Hinge angles at which a vertical phone counts as propped up in tabletop and shows its live split layout. */
const TABLETOP_RANGE = [45, 165] as const;
/** The outer display is 466 pt wide drawn 430 u wide: its points are a little smaller than the inner display's. */
const OUTER_PT = 430 / 466;

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'horizontal', label: 'Horizontal' },
  { id: 'vertical', label: 'Vertical' },
  { id: 'table', label: 'Table' },
];

const LOOK: Record<View, number> = { angled: 0, top: 1, bottom: -1 };

const poseFor = ({ category, fold, view }: Selection): Pose =>
  category === 'table'
    ? { orientation: 'vertical', angle: TABLETOP, look: LOOK[view] }
    : { orientation: category, angle: fold === 'open' ? OPEN : CLOSED, look: 0 };

const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/**
 * How far back the upright phone leans, in degrees. By default it leans with the fold, so a propped-up phone is seen
 * from three quarters. `look` swings that toward the pose where the top half (the cover, folded up by 180° × fold)
 * stands square to you, or back to 0 where the bottom half lies square to you.
 */
function leanFor(fold: number, look: number) {
  const angled = Math.min(fold, 1 - fold) * 100;
  if (look >= 0) return angled + (fold * 180 - angled) * look;
  return angled * (1 + look);
}
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface DuoSimulationProps {
  /** An HLS or Mux stream; adaptive sources fill the quality, audio and captions menus. */
  src: string;
  poster?: string;
  /** A WebVTT chapters file for the timeline and the title tile. */
  chapters?: string;
  /**
   * The skin's Duo layout to wrap the media in. It gets the same phone, poses and simulated fullscreen (it reads SimulatedFoldable and SimulatedFullscreen).
   */
  renderSkin: (media: ReactNode) => ReactNode;
}

export function DuoSimulation({ src, poster, chapters, renderSkin }: DuoSimulationProps) {
  const [selection, setSelection] = useState<Selection>({ category: 'vertical', fold: 'open', view: 'angled' });
  const [look, setLookState] = useState(0);
  const lookRef = useRef(0);
  const lookFrameRef = useRef(0);
  const [orientation, setOrientation] = useState<Orientation>('vertical');
  const [angle, setAngleState] = useState<number>(OPEN);
  const [animating, setAnimating] = useState(false);
  const [unit, setUnit] = useState(0.5);

  const areaRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const coverCanvasRef = useRef<HTMLCanvasElement>(null);
  const bodyCanvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef<number>(OPEN);
  const orientationRef = useRef<Orientation>(orientation);
  const frameRef = useRef(0);
  const prevOrientation = useRef<Orientation>(orientation);
  /** Resolves the pending turn once the quarter-turn animation has played. */
  const turnDone = useRef<(() => void) | null>(null);
  /** Each pose change bumps this; an older sequence that wakes up afterwards stops instead of fighting the new one. */
  const runRef = useRef(0);
  // Simulated fullscreen, and the selection to go back to when it ends.
  const [fullscreen, setFullscreen] = useState(false);
  const beforeFullscreen = useRef<Selection | null>(null);

  const device = DEVICE[orientation];
  const inner = INNER[orientation];
  const isOpen = angle === OPEN;
  const isClosed = angle === CLOSED;
  const inTabletop =
    orientation === 'vertical' && !animating && angle >= TABLETOP_RANGE[0] && angle <= TABLETOP_RANGE[1];
  const live = isOpen || isClosed || inTabletop;

  // What a real foldable would report right now.
  const reported: SimulatedFoldableValue = (() => {
    if (isClosed) {
      return { posture: 'continuous', split: 'none', segments: [], display: orientation === 'horizontal' ? 'outer-p' : 'outer-l' };
    }
    if (isOpen) return { posture: 'continuous', split: 'none', segments: [], display: 'inner' };
    const w = inner.w * unit;
    const h = inner.h * unit;
    const segments =
      orientation === 'vertical'
        ? [
            { top: 0, left: 0, width: w, height: h / 2 },
            { top: h / 2, left: 0, width: w, height: h / 2 },
          ]
        : [
            { top: 0, left: 0, width: w / 2, height: h },
            { top: 0, left: w / 2, width: w / 2, height: h },
          ];
    return { posture: 'folded', split: orientation === 'vertical' ? 'vertical' : 'horizontal', segments, display: 'inner' };
  })();

  // While the player is hidden mid-fold it keeps its last layout, so nothing reflows behind the moving cover.
  const [shown, setShown] = useState<SimulatedFoldableValue>(reported);
  const reportedKey = JSON.stringify(reported);
  useEffect(() => {
    if (live) setShown(JSON.parse(reportedKey) as SimulatedFoldableValue);
  }, [live, reportedKey]);
  const foldable = live ? reported : shown;
  const screen = foldable.display === 'inner' ? (orientation === 'vertical' ? 'inner-p' : 'inner-l') : foldable.display;

  const setAngle = (value: number) => {
    angleRef.current = value;
    setAngleState(value);
  };

  // Fit the device to the page: as wide as the column allows, never taller than ~720 px.
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const measure = () => {
      const maxHeight = Math.min(720, window.innerHeight - 140);
      setUnit(Math.max(0.2, Math.min(area.clientWidth / device.w, maxHeight / device.h)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [device.w, device.h]);

  // Turning the phone: the new pose starts a quarter turn back, so it reads as the old one rotating into place.
  useLayoutEffect(() => {
    if (prevOrientation.current === orientation) return;
    prevOrientation.current = orientation;
    const done = turnDone.current;
    turnDone.current = null;
    const animation = stageRef.current?.animate(
      [{ rotate: orientation === 'vertical' ? '-90deg' : '90deg' }, { rotate: '0deg' }],
      { duration: prefersReducedMotion() ? 0 : 560, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    );
    if (!done) return;
    if (animation) animation.finished.then(done, done);
    else done();
  }, [orientation]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      cancelAnimationFrame(lookFrameRef.current);
    },
    [],
  );

  /**
   * Freeze the current frame onto both halves, so the picture travels with the cover. Open, the player is full
   * screen, so one frame is split across the halves at the fold (side by side, or stacked when vertical).
   */
  // The poster (a thumbnail, for Mux streams), loaded up front so the fold has a picture to carry before any frame
  // has played. Drawing it doesn't need CORS: the canvases are only ever shown, never read back.
  const posterImage = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!poster) {
      posterImage.current = null;
      return;
    }
    const image = new Image();
    image.src = poster;
    posterImage.current = image;
  }, [poster]);

  const snapshot = () => {
    const video = areaRef.current?.querySelector('video');
    const halves = [coverCanvasRef.current, bodyCanvasRef.current];
    if (!video || !halves[0] || !halves[1]) return;
    const [cover] = halves as HTMLCanvasElement[];
    const ratio = window.devicePixelRatio || 1;
    for (const canvas of halves as HTMLCanvasElement[]) {
      canvas.width = Math.max(1, Math.round(canvas.offsetWidth * ratio));
      canvas.height = Math.max(1, Math.round(canvas.offsetHeight * ratio));
    }
    const stacked = orientationRef.current === 'vertical';
    const screenW = stacked ? cover.width : cover.width * 2;
    const screenH = stacked ? cover.height * 2 : cover.height;
    // The current frame once there is one; until playback has started, the poster (as the player itself shows).
    const image = posterImage.current;
    const usePoster = (video.played.length === 0 || video.readyState < 2) && !!image?.complete && image.naturalWidth > 0;
    const source: CanvasImageSource = usePoster && image ? image : video;
    const sourceW = usePoster && image ? image.naturalWidth : video.videoWidth;
    const sourceH = usePoster && image ? image.naturalHeight : video.videoHeight;
    const scale = sourceW ? Math.min(screenW / sourceW, screenH / sourceH) : 0;
    const w = sourceW * scale;
    const h = sourceH * scale;
    (halves as HTMLCanvasElement[]).forEach((canvas, index) => {
      const context = canvas.getContext('2d');
      if (!context) return;
      context.fillStyle = '#000';
      context.fillRect(0, 0, canvas.width, canvas.height);
      if (!scale) return;
      const x = (screenW - w) / 2 - (stacked ? 0 : index * cover.width);
      const y = (screenH - h) / 2 - (stacked ? index * cover.height : 0);
      try {
        context.drawImage(source, x, y, w, h);
      } catch {
        // A frame that can't be drawn just leaves the half black.
      }
    });
  };

  /** Swing the hinge to `target`. Resolves when it gets there; a fold cut short by a newer one never resolves. */
  function foldTo(target: number) {
    return new Promise<void>((resolve) => {
      const from = angleRef.current;
      cancelAnimationFrame(frameRef.current);
      if (from === target) {
        setAnimating(false);
        resolve();
        return;
      }
      snapshot();
      const duration = prefersReducedMotion() ? 0 : 1000 * (Math.abs(target - from) / 180);
      const start = performance.now();
      setAnimating(true);
      const step = (now: number) => {
        const k = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
        const eased = easeInOut(k);
        setAngle(k === 1 ? target : from + (target - from) * eased);
        if (k < 1) frameRef.current = requestAnimationFrame(step);
        else {
          setAnimating(false);
          resolve();
        }
      };
      frameRef.current = requestAnimationFrame(step);
    });
  }

  /** Tilt the propped-up phone toward a view (see leanFor). Resolves when it gets there. */
  function lookTo(target: number) {
    return new Promise<void>((resolve) => {
      const from = lookRef.current;
      cancelAnimationFrame(lookFrameRef.current);
      if (from === target) {
        resolve();
        return;
      }
      const duration = prefersReducedMotion() ? 0 : 700 * Math.min(1, Math.abs(target - from));
      const start = performance.now();
      const step = (now: number) => {
        const k = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
        const value = k === 1 ? target : from + (target - from) * easeInOut(k);
        lookRef.current = value;
        setLookState(value);
        if (k < 1) lookFrameRef.current = requestAnimationFrame(step);
        else resolve();
      };
      lookFrameRef.current = requestAnimationFrame(step);
    });
  }

  /** Turn the phone a quarter turn. Resolves when the turn has played. */
  function turnTo(target: Orientation) {
    return new Promise<void>((resolve) => {
      if (orientationRef.current === target) {
        resolve();
        return;
      }
      turnDone.current = resolve;
      orientationRef.current = target;
      setOrientation(target);
    });
  }

  /**
   * Move to a pose as one sequence. The phone only turns while it is flat open or shut: from Table it first opens
   * (or shuts, if the new pose is closed), then turns, then folds into the new pose. Picking again mid-way takes over
   * from wherever the phone is.
   */
  async function goTo(pose: Pose) {
    const run = ++runRef.current;
    const current = () => run === runRef.current;
    // A tilted phone straightens to its angled view before it folds or turns, and tilts again once it's there.
    const moving = pose.orientation !== orientationRef.current || pose.angle !== angleRef.current;
    if (moving && lookRef.current !== 0) {
      await lookTo(0);
      if (!current()) return;
    }
    if (pose.orientation !== orientationRef.current) {
      const a = angleRef.current;
      if (a !== OPEN && a !== CLOSED) {
        await foldTo(pose.angle === CLOSED ? CLOSED : OPEN);
        if (!current()) return;
      }
      cancelAnimationFrame(frameRef.current);
      setAnimating(false);
      await turnTo(pose.orientation);
      if (!current()) return;
    }
    await foldTo(pose.angle);
    if (!current()) return;
    await lookTo(pose.look);
  }

  const select = (next: Selection) => {
    setSelection(next);
    void goTo(poseFor(next));
  };

  /**
   * Fullscreen on the phone: turn it to suit the video. Open, that's sideways for wide video and upright for a tall
   * 9:16 clip; closed, the same rule applied to the outer display, which is the other way round (Vertical · Closed is
   * the landscape one). A closed phone stays closed; from Table it opens flat. If it's already that way, nothing
   * moves; the controls simply get out of the way. Leaving fullscreen puts the phone back the way it was.
   */
  const toggleFullscreen = () => {
    if (fullscreen) {
      const previous = beforeFullscreen.current;
      beforeFullscreen.current = null;
      setFullscreen(false);
      if (previous) select(previous);
      return;
    }
    const video = areaRef.current?.querySelector('video');
    const tall = fullscreenOrientationFor(video) === 'portrait';
    const fold: Fold = selection.category === 'table' ? 'open' : selection.fold;
    const target: Orientation = fold === 'closed' ? (tall ? 'horizontal' : 'vertical') : tall ? 'vertical' : 'horizontal';
    beforeFullscreen.current = selection;
    setFullscreen(true);
    select({ ...selection, category: target, fold });
  };

  /** Moving the phone by hand ends fullscreen where it is, without snapping back. */
  const leaveFullscreen = () => {
    beforeFullscreen.current = null;
    setFullscreen(false);
  };

  const fullscreenValue = useMemo<SimulatedFullscreenValue>(
    () => ({ active: fullscreen, toggle: toggleFullscreen }),
    // toggleFullscreen reads refs and current state; recreate it when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fullscreen, selection],
  );

  const fold = 1 - angle / OPEN;
  const lean = orientation === 'vertical' ? leanFor(fold, look) : 0;
  const pick = (next: Selection) => {
    leaveFullscreen();
    select(next);
  };
  const subLabel = CATEGORIES.find((c) => c.id === selection.category)?.label ?? '';
  const subOptions =
    selection.category === 'table'
      ? (['angled', 'top', 'bottom'] as const).map((view) => ({
          key: view,
          label: view === 'angled' ? 'Angled' : view === 'top' ? 'Top' : 'Bottom',
          pressed: selection.view === view,
          next: { ...selection, view },
        }))
      : (['open', 'closed'] as const).map((f) => ({
          key: f,
          label: f === 'open' ? 'Open' : 'Closed',
          pressed: selection.fold === f,
          next: { ...selection, fold: f },
        }));

  return (
    <div className={'pcd-sim'} data-orientation={orientation}>
      <div className={'pcd-sim-controls'}>
        <div className={'pcd-seg'} role="group" aria-label="Pose">
          {CATEGORIES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={selection.category === id}
              onClick={() => pick({ ...selection, category: id })}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Horizontal and Vertical choose Open or Closed; Table chooses how the propped-up phone is seen. */}
        <div className={'pcd-seg pcd-seg--sub'} role="group" aria-label={`${subLabel} options`}>
          {subOptions.map(({ key, label, pressed, next }) => (
            <button key={key} type="button" aria-pressed={pressed} onClick={() => pick(next)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div ref={areaRef} className={'pcd-sim-area'}>
        <div
          ref={stageRef}
          className={'pcd-stage'}
          style={{ '--u': `${unit}px`, width: device.w * unit, height: device.h * unit } as CSSProperties}
        >
          <div
            className={'pcd-dev'}
            data-flat={lean < 1 ? '' : undefined}
            style={{ '--fold': fold, '--lean': `${lean}deg` } as CSSProperties}
          >
            <div className={'pcd-dev-body'}>
              <div className={'pcd-face pcd-face--body'}>
                <canvas ref={bodyCanvasRef} className={'pcd-face-canvas'} />
              </div>
            </div>
            <div className={'pcd-dev-cover'}>
              <div className={'pcd-face pcd-face--cover'}>
                <canvas ref={coverCanvasRef} className={'pcd-face-canvas'} />
              </div>
              <div className={'pcd-face pcd-face--outer'}>
                <div className={'pcd-outer-glass'}>
                  <span className={'pcd-outer-rail'} />
                  <span className={'pcd-outer-camera'} />
                </div>
              </div>
            </div>

            <div
              className={'pcd-dev-screen'}
              data-screen={screen}
              data-visible={live ? '' : undefined}
              data-tabletop={live && inTabletop ? '' : undefined}
              inert={!live}
              style={{ '--pcd-sim-pt': `${unit * (screen.startsWith('outer') ? OUTER_PT : 1)}px` } as CSSProperties}
            >
              <SimulatedFoldable.Provider value={foldable}>
                <SimulatedFullscreen.Provider value={fullscreenValue}>
                  <VideoPlayer poster={poster}>
                    {renderSkin(
                      // crossOrigin lets the chapters track load and the fold animation copy video frames.
                      <HlsVideo src={src} playsInline crossOrigin="">
                        {chapters ? <track kind="chapters" label="English" srcLang="en" src={chapters} default /> : null}
                      </HlsVideo>,
                    )}
                  </VideoPlayer>
                </SimulatedFullscreen.Provider>
              </SimulatedFoldable.Provider>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
