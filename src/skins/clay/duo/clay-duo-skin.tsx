/** @jsxImportSource react */

'use client';

/**
 * Clay · Duo — the clay console laid out for the iPhone Duo. Like Papercut · Duo and Sketch · Duo it picks its layout
 * from the device posture and viewport segments (src/foldable), so the same code runs in the site's fold simulation
 * and on a real foldable:
 *   open flat         the picture full-bleed and a black clay console: below it upright, floating over it sideways
 *   propped up        the picture in a black clay frame on the top half; the black console on the bottom half
 *   closed            every button in a black rail under the camera; upright, abstract clay shapes as wallpaper
 *   fullscreen        the picture full-bleed; the console (or the rail) floats over it and steps away when idle
 *
 * Layouts are data (./duo-layouts.ts) in the units of the Blender scene they were designed in
 * (skins-src/clay/blender/clay_duo.blend); the console's clay pieces are sprites from the same file (./assets). The
 * controls are the clay skin's own, from ../skin, with square clay keys in place of discs where the design has keys.
 * It lives outside ../skin because `npm run sync-skin -- clay` replaces ../skin wholesale. The phone, its poses and
 * the simulated fullscreen come from the Papercut · Duo route.
 */
import { Controls, Menu, Time, usePlayer } from '@videojs/react';
import { selectControls, selectFullscreen, selectTextTrack, selectTime } from '@videojs/core/dom';
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';

import { foldableAttributes, useFoldable } from '../../../duo-kit/foldable';
import { SimulatedFullscreen, duoLayoutFor, useFullscreenOrientationLock } from '../../../duo-kit/duo-shared';
import { AirPlayButton } from '../skin/ui/airplay-button';
import { AudioTrackMenu } from '../skin/ui/audio-track-menu';
import { BufferingIndicator } from '../skin/ui/buffering-indicator';
import { Button } from '../skin/ui/button';
import { CaptionsButton } from '../skin/ui/captions-button';
import { CaptionsSubmenu } from '../skin/ui/captions-submenu';
import { CastButton } from '../skin/ui/cast-button';
import { ClayFonts } from '../skin/ui/clay-fonts';
import { FullscreenEnterIcon, FullscreenExitIcon, GearIcon } from '../skin/ui/clay-icons';
import { Container } from '../skin/ui/container';
import { ErrorDialog } from '../skin/ui/error-dialog';
import { FullscreenButton } from '../skin/ui/fullscreen-button';
import { MuteButton } from '../skin/ui/mute-button';
import { PiPButton } from '../skin/ui/pip-button';
import { PlayButton } from '../skin/ui/play-button';
import { PlaybackRateSubmenu } from '../skin/ui/playback-rate-submenu';
import { Poster } from '../skin/ui/poster';
import { QualityMenu } from '../skin/ui/quality-menu';
import { SeekButton } from '../skin/ui/seek-button';
import { TimeSlider } from '../skin/ui/time-slider';
import { VolumeSlider } from '../skin/ui/volume-slider';
import { cn } from '../skin/lib/resolve-class-name';
import { VideoGestures } from '../skin/video/behaviors/gestures';
import { VideoHotkeys } from '../skin/video/behaviors/hotkeys';
import { VideoStatusIndicators } from '../skin/video/display/status-indicators';
import { CONSOLE_SPRITES } from './console-sprites';
import { DUO_LAYOUTS, SPLIT_TOP, type ClayDuoLayout, type ClayDuoMode, type LayoutItem, type SpotItem } from './duo-layouts';
// The clay skin's styles (its main skin normally brings them in), then the island's (the pieces-and-spots engine this
// layout reuses), then the Duo's: the page stands on its own, and each layer is declared after the one it overrides.
import '../skin/styles/video/base.css';
import '../skin/video/skin.css';
import '../skin/styles/clay.css';
import '../skin/video/island/island.css';
import './duo.css';

/** The chapter playing now, from the media's chapters track; null when it has none. */
function useCurrentChapter(): string | null {
  const cues = usePlayer(selectTextTrack)?.chaptersCues;
  const time = usePlayer(selectTime)?.currentTime ?? 0;
  return cues?.find((cue) => time >= cue.startTime && time < cue.endTime)?.text ?? null;
}

/** An element's size in px, kept current as it resizes. */
function useSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

interface Frame {
  layout: ClayDuoLayout;
  /** px per scene unit. */
  u: number;
  ox: number;
  oy: number;
}

/** Fit the layout's scene into the stage, centred. Each Duo layout has its screen's aspect, so it fills it. */
function frameFor(layout: ClayDuoLayout, w: number, h: number): Frame {
  const W = layout.x1 - layout.x0;
  const H = layout.y1 - layout.y0;
  const u = Math.min(w / W, h / H);
  return { layout, u, ox: (w - W * u) / 2, oy: (h - H * u) / 2 };
}

const px = (n: number) => `${Math.round(n * 100) / 100}px`;

/** Which edge a piece slides off to when the overlaid controls hide. */
function sideOf(layout: ClayDuoLayout, x: number, y: number) {
  const W = layout.x1 - layout.x0;
  const H = layout.y1 - layout.y0;
  if (x > layout.x1 - W * 0.15) return 'right';
  if (y < layout.y0 + H * 0.3) return 'bottom';
  if (y > layout.y1 - H * 0.25) return 'top';
  return x < 0 ? 'left' : 'right';
}

/**
 * Places a piece or control with a transform, not left/top. Propped up in the simulation, the console lies on the
 * phone's tilted body, and Chrome hit-tests absolutely positioned boxes there as if the body weren't tilted: clicks
 * at left/top-placed controls land on nothing. Boxes moved by a transform are hit-tested where they're drawn.
 * (`transform`, not `translate`, so the fullscreen slide-off in island.css, which animates `translate`, adds to it.)
 */
const placeAt = (x: number, y: number): CSSProperties => ({ left: 0, top: 0, transform: `translate(${px(x)}, ${px(y)})` });

function itemStyle({ layout, u, ox, oy }: Frame, item: LayoutItem): CSSProperties {
  const X = (x: number) => ox + (x - layout.x0) * u;
  const Y = (y: number) => oy + (layout.y1 - y) * u;
  if ('piece' in item) {
    const b = CONSOLE_SPRITES[item.piece];
    return {
      ...placeAt(X(item.x + b.u0), Y(item.y + b.v1)),
      width: px((b.u1 - b.u0) * u),
      height: px((b.v1 - b.v0) * u),
    };
  }
  const w = (item.d ?? item.w ?? 1) * u;
  const h = (item.d ?? item.h ?? 1) * u;
  return {
    ...placeAt(X(item.x) - w / 2, Y(item.y) - h / 2),
    width: px(w),
    height: px(h),
    ['--ci-w' as string]: px(w),
    ['--ci-h' as string]: px(h),
  };
}

/** Propped up, the top half is its own box (it folds with the cover): the picture and its frame in % of it. */
const pct = (n: number) => `${Math.round(n * 10000) / 100}%`;
function splitRect(x: number, y: number, w: number, h: number): CSSProperties {
  return {
    left: pct((x - w / 2 + SPLIT_TOP.w / 2) / SPLIT_TOP.w),
    top: pct((SPLIT_TOP.h - (y + h / 2)) / SPLIT_TOP.h),
    width: pct(w / SPLIT_TOP.w),
    height: pct(h / SPLIT_TOP.h),
  };
}
const { picture: splitPicture, frame: splitFrame } = SPLIT_TOP;
const splitPictureStyle = splitRect(splitPicture.x, splitPicture.y, splitPicture.w, splitPicture.h);
const splitFrameSprite = CONSOLE_SPRITES[splitFrame.piece];
const splitFrameStyle = splitRect(
  splitFrame.x + (splitFrameSprite.u0 + splitFrameSprite.u1) / 2,
  splitFrame.y + (splitFrameSprite.v0 + splitFrameSprite.v1) / 2,
  splitFrameSprite.u1 - splitFrameSprite.u0,
  splitFrameSprite.v1 - splitFrameSprite.v0,
);

/** Real fullscreen on a page; inside the Duo mockup, the simulation's own (it turns the drawn phone). */
function DuoFullscreenButton() {
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
      <FullscreenEnterIcon className={cn('media-button-icon', 'media-fullscreen-button-enter-icon')} />
      <FullscreenExitIcon className={cn('media-button-icon', 'media-fullscreen-button-exit-icon')} />
    </Button>
  );
}

/**
 * The clay settings key: quality, audio, speed and captions, each only when the media offers them. On the console it
 * opens above the key and runs right, into the console (the key sits on its left); on the closed phone's rail it opens
 * beside the rail, running left over the picture, so it never leaves the screen. Propped up (split), the menu opens on
 * the board itself instead of the browser's top layer, which is always drawn flat over the page: as an ordinary child
 * of the bottom half it lies there and tilts with it (duo.css places it). No tooltip: phones don't hover.
 */
function DuoSettingsMenu({ onBoard, onRail, boundary }: { onBoard: boolean; onRail: boolean; boundary: HTMLElement | null }) {
  // Controlled so a layout change closes it: the menu can't move between the board and the top layer while open.
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [onBoard]);
  return (
    <Menu.Root
      open={open}
      onOpenChange={setOpen}
      side={onRail ? 'left' : 'top'}
      align={onRail ? 'end' : 'start'}
      boundary={onBoard && boundary ? boundary : 'container'}
    >
      <Menu.Trigger render={<Button />} className={'media-settings-menu-trigger'} aria-label="Settings">
        <GearIcon className={cn('media-button-icon-base', 'media-settings-menu-trigger-icon')} />
      </Menu.Trigger>
      <Menu.Popup
        keepMounted
        className={cn('media-popup', 'media-popup-surface', 'media-menu-popup', 'media-menu-resizable-popup', 'cdu-menu')}
        data-on-board={onBoard ? '' : undefined}
        {...(onBoard ? { popover: undefined } : {})}
      >
        <Menu.Content className={'media-menu-content'}>
          <QualityMenu />
          <AudioTrackMenu />
          <PlaybackRateSubmenu />
          <CaptionsSubmenu />
        </Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  );
}

interface SpotProps {
  item: SpotItem;
  title: string;
  chapter: string | null;
  onBoard: boolean;
  onRail: boolean;
  board: HTMLElement | null;
}

function SpotControl({ item, title, chapter, onBoard, onRail, board }: SpotProps) {
  switch (item.spot) {
    case 'play':
      return <PlayButton className={'ci-play'} />;
    case 'back':
      return <SeekButton className={'ci-seek'} seconds={-10} />;
    case 'fwd':
      return <SeekButton className={'ci-seek'} seconds={10} />;
    case 'mute':
      return <MuteButton />;
    case 'volume':
      return <VolumeSlider orientation={item.vertical ? 'vertical' : 'horizontal'} />;
    case 'captions':
      return <CaptionsButton />;
    case 'settings':
      return <DuoSettingsMenu onBoard={onBoard} onRail={onRail} boundary={board} />;
    case 'pip':
      return <PiPButton />;
    case 'fullscreen':
      return <DuoFullscreenButton />;
    case 'cast':
      return <CastButton />;
    case 'airplay':
      return <AirPlayButton />;
    case 'rail':
      return (
        <div className={'ci-rail'}>
          <Time.Value className={cn('media-time-value', 'ci-time')} type="current" />
          <TimeSlider />
          <Time.Value className={cn('media-time-value', 'ci-time')} type="duration" />
        </div>
      );
    case 'title':
      // Live text: the title as given (the Duo simulation's player has no title of its own), and the chapter now.
      return (
        <div className={'ci-title'}>
          <span className={'ci-title-main'}>{title}</span>
          {chapter ? <span className={'ci-title-chapter'}>{chapter}</span> : null}
        </div>
      );
  }
}

export interface ClayDuoSkinProps extends Omit<NonNullable<ComponentProps<typeof Container>>, 'children'> {
  children?: ReactNode;
  title?: string;
}

export function ClayDuoSkin({ children, className, style, title = 'Duo demo', ...props }: ClayDuoSkinProps) {
  const screenRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const foldable = useFoldable(screenRef);
  const { style: segmentStyle, ...foldAttributes } = foldableAttributes(foldable);
  const duoLayout = duoLayoutFor(foldable);
  const simulatedFullscreen = useContext(SimulatedFullscreen);
  const realFullscreen = usePlayer(selectFullscreen)?.isFullscreen ?? false;
  const fullscreen = foldable.simulated ? (simulatedFullscreen?.active ?? false) : realFullscreen;
  const controlsVisible = usePlayer(selectControls)?.controlsVisible ?? true;
  const chapter = useCurrentChapter();
  const { w, h } = useSize(stageRef);
  const [board, setBoard] = useState<HTMLElement | null>(null);
  useFullscreenOrientationLock(screenRef, foldable.fullscreen);

  // Open flat: upright gets the console below the picture, sideways (and fullscreen) the console over it. Closed:
  // the rail beside the picture, or over it in fullscreen.
  const mode: ClayDuoMode =
    duoLayout === 'split'
      ? 'split'
      : duoLayout === 'outer-p' || duoLayout === 'outer-l'
        ? fullscreen
          ? 'fs-outer'
          : duoLayout
        : h > w
          ? 'full-p'
          : 'full-l';
  const frame = frameFor(DUO_LAYOUTS[mode], w, h);
  const { layout, u } = frame;
  const onBoard = mode === 'split';
  const onRail = mode === 'outer-p' || mode === 'outer-l' || mode === 'fs-outer';
  // Propped up in the simulation the phone is already its own little screen: no fullscreen key there. On a real Duo
  // the split layout only appears in fullscreen, where the key is the way out, so it stays.
  const items = onBoard && foldable.simulated ? layout.items.filter((item) => !('spot' in item && item.spot === 'fullscreen')) : layout.items;
  const fs = layout.overlay === true;

  const screenStyle: CSSProperties | undefined =
    typeof layout.screen === 'string'
      ? undefined
      : {
          left: px(frame.ox + (layout.screen.x - layout.screen.w / 2 - layout.x0) * u),
          top: px(frame.oy + (layout.y1 - layout.screen.y - layout.screen.h / 2) * u),
          width: px(layout.screen.w * u),
          height: px(layout.screen.h * u),
        };

  return (
    <Container
      className={cn('video-skin', 'clay-skin', 'clay-island', 'clay-duo', className)}
      data-theme="default"
      data-preset="video"
      data-mode={mode}
      data-layout={duoLayout}
      data-fs={fs ? '' : undefined}
      data-idle={fs && !controlsVisible ? '' : undefined}
      {...foldAttributes}
      style={{ ...segmentStyle, ...(typeof style === 'object' ? style : {}) }}
      {...props}
    >
      <ClayFonts />

      {/* The picture: in its clay frame, full-bleed, or (propped up) framed on the top half, which folds with the cover. */}
      <div ref={screenRef} className={cn('ci-screen', 'cdu-screen')} style={screenStyle}>
        <div className={'cdu-picture'} style={onBoard ? splitPictureStyle : undefined}>
          {children}
          <Poster />
          <BufferingIndicator />
          <VideoStatusIndicators />
        </div>
        {onBoard ? (
          <img className={'cdu-frame'} src={CONSOLE_SPRITES[SPLIT_TOP.frame.piece].src} alt="" aria-hidden="true" draggable={false} decoding="async" style={splitFrameStyle} />
        ) : null}
      </div>

      {/* The fold, when propped up: a soft seam along the top of the console half. Nothing interactive sits on it. */}
      <div className={'cdu-crease'} aria-hidden="true" />

      {/* The console and its controls: the whole screen, or the bottom half when propped up. */}
      <div ref={stageRef} className={cn('ci-stage', 'cdu-stage')} style={{ ['--ci-u' as string]: px(u) }}>
        {u > 0 ? (
          <Controls.Root>
            <Controls.Content
              ref={setBoard}
              className={cn('video-controls', 'ci-controls')}
              role="group"
              aria-label="Player controls"
            >
              {items.map((item, i) => {
                const side = sideOf(layout, item.x, item.y);
                if ('piece' in item) {
                  return (
                    <img
                      key={`${mode}-${item.piece}-${i}`}
                      className={'ci-item ci-piece'}
                      data-side={side}
                      src={CONSOLE_SPRITES[item.piece].src}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      decoding="async"
                      style={itemStyle(frame, item)}
                    />
                  );
                }
                return (
                  <div
                    key={`${mode}-${item.spot}`}
                    className={cn('ci-item', 'ci-spot', `ci-spot--${item.spot}`, item.k && 'cdu-key', item.k && `cdu-key--${item.k}`)}
                    data-side={side}
                    style={itemStyle(frame, item)}
                  >
                    <SpotControl item={item} title={title} chapter={chapter} onBoard={onBoard} onRail={onRail} board={board} />
                  </div>
                );
              })}
            </Controls.Content>
          </Controls.Root>
        ) : null}
      </div>

      {/* Outer display only: the camera cutout, a ring of teal clay round it. */}
      <div className={'cdu-camera'} aria-hidden="true" />

      <ErrorDialog />
      <VideoHotkeys />
      <VideoGestures />
    </Container>
  );
}
