/** @jsxImportSource react */

'use client';

// Annotated Page · Duo — the open-book player laid out for the iPhone Duo. The layout comes from the device posture
// and viewport segments (see src/foldable), the same way as the other Duo skins:
//   inner, landscape   open flat, fold running top to bottom: the book spread, the fold as its spine
//   inner, portrait    open flat, fold running across: the film on the top half, the page on the bottom half
//   split              propped up (tabletop): the film on the top half that stands up, the page lying flat below
//   outer-p            closed, upright: a composition notebook (film taped to the marbled cover, index-tab rail)
//   outer-l            closed, sideways: the same notebook, the film edge to edge under its label
// Fullscreen (real, or the simulation's) uses the web skin's fullscreen: the page turns in over the film when paused.
// It is one DOM in every pose, so the video never remounts and keeps playing while the phone moves. Controls on the
// closed phone sit in the iOS 27 edge rail: 73 pt on the trailing edge, 48 pt buttons 12 pt apart.
// The Duo is a phone, so the skin is touch-only in every pose, even when the simulator is driven with a mouse: hovering
// does nothing (see useTouchOnly), controls answer a press instead, a tap brings the hidden controls back, and inside
// the simulated phone the pointer is drawn as a fingertip.
// It reuses the web skin from ../skin and lives outside it, because `npm run sync-skin -- annotated` replaces ../skin.
import {
  CaptionsButton as CaptionsButtonPrimitive,
  MuteButton as MuteButtonPrimitive,
  PlayButton as PlayButtonPrimitive,
  SeekButton as SeekButtonPrimitive,
  Title,
} from '@videojs/react';
import {
  CaptionsOffIcon,
  CaptionsOnIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PauseIcon,
  PlayIcon,
  SeekIcon,
  VolumeHighIcon,
  VolumeOffIcon,
} from '@videojs/react/icons';
import { usePlayer } from '@videojs/react/video';
import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';

import { foldableAttributes, useFoldable } from '../../../duo-kit/foldable';
import { SimulatedFullscreen, duoLayoutFor, useFullscreenOrientationLock } from '../../../duo-kit/duo-shared';
import { cn } from '../skin/lib/resolve-class-name';
import { Container } from '../skin/ui/container';
import { VideoHotkeys } from '../skin/video/behaviors/hotkeys';
import { useChapters } from '../skin/video/annotated/chapters';
import { AnnotatedStage } from '../skin/video/annotated/stage';
// The web skin's styles: its VideoSkin normally brings them in. Imported here so the page stands on its own.
import '../skin/styles/video/base.css';
import '../skin/video/skin.css';
import '../skin/styles/annotated.css';
import './duo.css';

const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400&family=Kalam:wght@400;700&family=Space+Mono:wght@700&display=swap';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/** The six rail controls on the closed phone, as coloured index tabs on the notebook's page edges. */
function Rail({ fullscreen }: { fullscreen: { active: boolean; toggle: () => void } }) {
  const paused = usePlayer((s) => s.paused) ?? true;
  const muted = usePlayer((s) => s.muted) ?? false;
  const captions = usePlayer((s) => s.subtitlesShowing) ?? false;
  return (
    <div className={'apd-rail'}>
      <div className={'apd-status'} aria-hidden="true">
        <span>9:41</span>
        <svg viewBox="0 0 26 26">
          <circle cx="13" cy="13" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.35" />
          <circle
            cx="13"
            cy="13"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray="50 63"
            strokeLinecap="round"
            transform="rotate(-90 13 13)"
          />
        </svg>
      </div>
      <div className={'apd-rail-group'} role="group" aria-label="Playback">
        <PlayButtonPrimitive className={'apd-tab'} data-tab="pink" aria-label={paused ? 'Play' : 'Pause'}>
          {paused ? <PlayIcon className={'apd-icon'} /> : <PauseIcon className={'apd-icon'} />}
        </PlayButtonPrimitive>
        <SeekButtonPrimitive className={'apd-tab'} data-tab="green" seconds={-10} aria-label="Back 10 seconds">
          <SeekIcon className={cn('apd-icon', 'apd-icon--back')} />
          <span className={'apd-ten'}>10</span>
        </SeekButtonPrimitive>
        <SeekButtonPrimitive className={'apd-tab'} data-tab="green" seconds={10} aria-label="Ahead 10 seconds">
          <SeekIcon className={'apd-icon'} />
          <span className={'apd-ten'}>10</span>
        </SeekButtonPrimitive>
      </div>
      <div className={cn('apd-rail-group', 'apd-rail-group--end')} role="group" aria-label="More controls">
        <CaptionsButtonPrimitive className={'apd-tab'} data-tab="blue" aria-label={captions ? 'Turn captions off' : 'Turn captions on'}>
          {captions ? <CaptionsOnIcon className={'apd-icon'} /> : <CaptionsOffIcon className={'apd-icon'} />}
        </CaptionsButtonPrimitive>
        <MuteButtonPrimitive className={'apd-tab'} data-tab="lavender" aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? <VolumeOffIcon className={'apd-icon'} /> : <VolumeHighIcon className={'apd-icon'} />}
        </MuteButtonPrimitive>
        <button
          type="button"
          className={'apd-tab'}
          data-tab="yellow"
          aria-label={fullscreen.active ? 'Exit full screen' : 'Full screen'}
          onClick={fullscreen.toggle}
        >
          {fullscreen.active ? <FullscreenExitIcon className={'apd-icon'} /> : <FullscreenEnterIcon className={'apd-icon'} />}
        </button>
      </div>
    </div>
  );
}

/** The label on the composition notebook's cover: the film and the chapter written on its ruled lines. */
function CompositionLabel({ title }: { title?: string }) {
  const state = useChapters();
  const cue = state.cues[state.index];
  return (
    <section className={'apd-label'} aria-label="Now playing">
      <span className={'apd-label-head'} aria-hidden="true">
        Composition
      </span>
      <p className={'apd-label-row'}>
        <span className={'apd-label-key'}>Film</span>
        <span className={'apd-label-value'}>{title ?? <Title />}</span>
      </p>
      {cue ? (
        <p className={'apd-label-row'}>
          <span className={'apd-label-key'}>Chapter</span>
          <span className={'apd-label-value'}>
            {ROMAN[state.index] ?? state.index + 1} · {cue.text}
          </span>
        </p>
      ) : null}
    </section>
  );
}

// Hover-only mouse events: moving, entering and leaving with no button held. A finger can't do any of these.
const HOVER_EVENTS = [
  'pointermove',
  'pointerover',
  'pointerout',
  'pointerenter',
  'pointerleave',
  'mousemove',
  'mouseover',
  'mouseout',
  'mouseenter',
  'mouseleave',
] as const;

/**
 * Stops a mouse from hovering anything inside `el`. Hover-only mouse events are caught on their way down and go no
 * further, so the player doesn't wake its controls when the mouse passes over, menus don't highlight rows under it, and
 * nothing opens on hover. Clicks, drags (a button is held) and real touch pass through untouched.
 */
function useTouchOnly(getElement: () => HTMLElement | null | undefined) {
  useEffect(() => {
    const el = getElement();
    if (!el) return;
    const swallow = (event: Event) => {
      const mouse = event as MouseEvent;
      if (mouse.buttons !== 0) return;
      if ('pointerType' in event && (event as PointerEvent).pointerType !== 'mouse') return;
      event.stopPropagation();
    };
    for (const type of HOVER_EVENTS) el.addEventListener(type, swallow, { capture: true });
    return () => {
      for (const type of HOVER_EVENTS) el.removeEventListener(type, swallow, { capture: true });
    };
  }, [getElement]);
}

export interface AnnotatedDuoSkinProps extends Omit<NonNullable<ComponentProps<typeof Container>>, 'children'> {
  children?: ReactNode;
  /** The film's title (the Duo simulation's player doesn't carry one). */
  title?: string;
}

export function AnnotatedDuoSkin({ children, className, style, title, ...props }: AnnotatedDuoSkinProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const getHost = useCallback(() => ref.current?.parentElement, []);
  const foldable = useFoldable(ref);
  const { style: segmentStyle, ...foldAttributes } = foldableAttributes(foldable);
  const layout = duoLayoutFor(foldable);
  useFullscreenOrientationLock(ref, foldable.fullscreen);
  const simulated = useContext(SimulatedFullscreen);
  const store = usePlayer();
  const browserFullscreen = usePlayer((s) => s.isFullscreen) ?? false;

  // Open flat, the page needs to know which way the fold runs: across a portrait screen, or down a landscape one.
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shape, setShape] = useState<'landscape' | 'portrait'>('landscape');
  useLayoutEffect(() => {
    const el = ref.current?.parentElement;
    hostRef.current = el as HTMLDivElement | null;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const box = entry!.contentRect;
      setShape(box.width >= box.height ? 'landscape' : 'portrait');
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useTouchOnly(getHost);

  const fullscreen = simulated ?? {
    active: browserFullscreen,
    toggle: () => void (browserFullscreen ? store.exitFullscreen() : store.requestFullscreen()),
  };
  const outer = layout.startsWith('outer');

  // Turned to Vertical · Open in the simulation (open flat, the fold running top to bottom), the film starts out
  // fullscreen: it fills the screen and the page turns in when paused. The fullscreen footnote steps back to the book
  // spread, and every time the phone comes back to this pose it starts fullscreen again. If the simulation itself is
  // in fullscreen (entered from another pose), its own toggle takes over, so leaving puts the phone back.
  const openSideways = foldable.simulated && layout === 'full' && shape === 'landscape';
  const [sidewaysFullscreen, setSidewaysFullscreen] = useState(true);
  useEffect(() => {
    setSidewaysFullscreen(true);
  }, [openSideways]);
  const fullscreenControl = simulated
    ? simulated.active || !openSideways
      ? simulated
      : { active: sidewaysFullscreen, toggle: () => setSidewaysFullscreen((on) => !on) }
    : null;

  return (
    <Container
      className={cn('video-skin', 'annotated-skin', 'annotated-duo', className)}
      data-theme="default"
      data-preset="video"
      data-duo={layout === 'full' ? `inner-${shape}` : layout}
      data-input="touch"
      {...foldAttributes}
      style={{ ...segmentStyle, ...(typeof style === 'object' ? style : {}) }}
      {...props}
    >
      <span ref={ref} className={'apd-anchor'} aria-hidden="true" />
      <link rel="stylesheet" href={FONT_URL} precedence="default" />
      <AnnotatedStage
        fullscreenControl={fullscreenControl}
        marginNote={null}
        title={title}
        inlinePopups={layout === 'split'}
        touch
        extras={
          <>
            {outer ? <CompositionLabel title={title} /> : null}
            {layout === 'outer-p' ? (
              <span className={'apd-note'} aria-hidden="true">
                open the cover to read more →
              </span>
            ) : null}
            {outer ? <Rail fullscreen={fullscreen} /> : null}
            {outer ? <span className={'apd-camera'} aria-hidden="true" /> : null}
            <span className={'apd-crease'} aria-hidden="true" />
          </>
        }
      >
        {children}
      </AnnotatedStage>
      <VideoHotkeys />
    </Container>
  );
}
