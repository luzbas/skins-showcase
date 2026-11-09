/** @jsxImportSource react */

'use client';

/**
 * Clay · Island — the clay player as a little diorama instead of a control bar. The video plays on a chunky yellow
 * clay TV standing on a floating grass island; cast and AirPlay are the tips of its antennas, the timeline runs along
 * its chin, and back / play / forward stand on the grass in front. A mushroom on the left holds the sound (mute on the
 * stem, volume across the cap) and a tree on the right holds captions, settings, picture-in-picture and fullscreen.
 * A cloud carries the title and the chapter playing now.
 *
 * Narrow players stack the same island for a phone. Fullscreen drops the TV: the video fills the screen and the
 * island's pieces stand over its edges while the controls show (paused, or the pointer moves, or a tap), sliding off
 * when idle. On a phone held sideways the controls are grouped: mushroom (sound and casting), tree (view options),
 * title cloud (leave fullscreen) and a little island (transport), so nothing needs scrolling.
 *
 * Every piece is a Blender render (`blender/clay_diorama.blend`); `layouts.ts` places them in the units they were
 * modelled in, and this component scales those units to the player's size.
 */
import { Controls, Time, usePlayer } from '@videojs/react';
import { selectControls, selectFullscreen, selectTextTrack, selectTime } from '@videojs/core/dom';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';

import { AirPlayButton } from '../../ui/airplay-button';
import { BufferingIndicator } from '../../ui/buffering-indicator';
import { CaptionsButton } from '../../ui/captions-button';
import { CastButton } from '../../ui/cast-button';
import { ClayFonts } from '../../ui/clay-fonts';
import { Container } from '../../ui/container';
import { ErrorDialog } from '../../ui/error-dialog';
import { FullscreenButton } from '../../ui/fullscreen-button';
import { MuteButton } from '../../ui/mute-button';
import { PiPButton } from '../../ui/pip-button';
import { PlayButton } from '../../ui/play-button';
import { Poster } from '../../ui/poster';
import { SeekButton } from '../../ui/seek-button';
import { TimeSlider } from '../../ui/time-slider';
import { Title } from '../../ui/title';
import { VolumeSlider } from '../../ui/volume-slider';
import { cn } from '../../lib/resolve-class-name';

import { VideoGestures } from '../behaviors/gestures';
import { VideoHotkeys } from '../behaviors/hotkeys';
import { VideoStatusIndicators } from '../display/status-indicators';
import { VideoSettingsMenu } from '../menus/settings-menu';
import { LAYOUTS, type IslandLayout, type LayoutItem, type LayoutMode, type SpotId } from './layouts';
import { SPRITES } from './sprites';
import './island.css';

/** Below this width (in px) an inline player stacks the island for a phone. */
const PHONE_BELOW = 720;

/** The chapter playing now, from the media's chapters track; null when it has none. */
function useCurrentChapter(): string | null {
  const cues = usePlayer(selectTextTrack)?.chaptersCues;
  const time = usePlayer(selectTime)?.currentTime ?? 0;
  return cues?.find((cue) => time >= cue.startTime && time < cue.endTime)?.text ?? null;
}

/** The stage's size in px, kept current as the player resizes. */
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

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const query = matchMedia('(pointer: coarse)');
    const read = () => setCoarse(query.matches);
    read();
    query.addEventListener('change', read);
    return () => query.removeEventListener('change', read);
  }, []);
  return coarse;
}

/**
 * On a phone, fullscreen turns the screen to suit the video (landscape for wide video). Android browsers honour the
 * Screen Orientation API in fullscreen; iOS ignores it, so there the person turns the phone and the layout follows.
 */
function useFullscreenOrientationLock(ref: RefObject<HTMLElement | null>, fullscreen: boolean) {
  useEffect(() => {
    const orientation = screen.orientation as ScreenOrientation & { lock?: (type: string) => Promise<void> };
    if (!fullscreen || !orientation?.lock) return;
    const video = ref.current?.querySelector('video');
    if (!video?.videoWidth || !video.videoHeight) return;
    orientation.lock(video.videoWidth >= video.videoHeight ? 'landscape' : 'portrait').catch(() => {
      // Not supported or refused (desktop browsers, iOS).
    });
    return () => {
      try {
        orientation.unlock();
      } catch {
        // Already unlocked.
      }
    };
  }, [ref, fullscreen]);
}

interface Frame {
  layout: IslandLayout;
  /** px per scene unit. */
  u: number;
  ox: number;
  oy: number;
  /** Stage height in px (inline only; fullscreen fills the screen). */
  height?: number;
}

function frameFor(mode: LayoutMode, w: number, h: number): Frame {
  const layout = LAYOUTS[mode];
  const W = layout.x1 - layout.x0;
  const H = layout.y1 - layout.y0;
  if (mode === 'desktop' || mode === 'phone') {
    const u = w / W;
    return { layout, u, ox: 0, oy: 0, height: Math.round(H * u) };
  }
  const u = Math.min(w / W, h / H);
  return { layout, u, ox: (w - W * u) / 2, oy: (h - H * u) / 2 };
}

const px = (n: number) => `${Math.round(n * 100) / 100}px`;

/** Which edge a piece slides off to when the fullscreen controls hide. */
function sideOf(layout: IslandLayout, x: number, y: number) {
  const H = layout.y1 - layout.y0;
  if (y < layout.y0 + H * 0.28) return 'bottom';
  if (y > layout.y1 - H * 0.25) return 'top';
  if (Math.abs(x) < 3.2) return 'center';
  return x < 0 ? 'left' : 'right';
}

function itemStyle({ layout, u, ox, oy }: Frame, item: LayoutItem): CSSProperties {
  const X = (x: number) => ox + (x - layout.x0) * u;
  const Y = (y: number) => oy + (layout.y1 - y) * u;
  if ('piece' in item) {
    const b = SPRITES[item.piece];
    const s = item.s ?? 1;
    return {
      left: px(X(item.x + b.u0 * s)),
      top: px(Y(item.y + b.v1 * s)),
      width: px((b.u1 - b.u0) * s * u),
      height: px((b.v1 - b.v0) * s * u),
      transformOrigin: `${px(-b.u0 * s * u)} ${px(b.v1 * s * u)}`,
      rotate: item.rot ? `${item.rot}deg` : undefined,
    };
  }
  const w = (item.d ?? item.w ?? 1) * u;
  const h = (item.d ?? item.h ?? 1) * u;
  return {
    left: px(X(item.x) - w / 2),
    top: px(Y(item.y) - h / 2),
    width: px(w),
    height: px(h),
    ['--ci-w' as string]: px(w),
    ['--ci-h' as string]: px(h),
  };
}

function SpotControl({ id, chapter }: { id: SpotId; chapter: string | null }) {
  switch (id) {
    case 'play':
      return <PlayButton className={'ci-play'} />;
    case 'back':
      return <SeekButton className={'ci-seek'} seconds={-10} />;
    case 'fwd':
      return <SeekButton className={'ci-seek'} seconds={10} />;
    case 'mute':
      return <MuteButton />;
    case 'volume':
      return <VolumeSlider orientation="horizontal" />;
    case 'captions':
      return <CaptionsButton />;
    case 'settings':
      return <VideoSettingsMenu />;
    case 'pip':
      return <PiPButton />;
    case 'fullscreen':
      return <FullscreenButton />;
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
      return (
        <div className={'ci-title'}>
          <Title className={'ci-title-main'} />
          {chapter ? <span className={'ci-title-chapter'}>{chapter}</span> : null}
        </div>
      );
  }
}

export interface IslandVideoSkinProps extends Omit<NonNullable<ComponentProps<typeof Container>>, 'children'> {
  children?: ReactNode;
  /**
   * Design review only: show one layout regardless of size or fullscreen. The fullscreen ones cover the window
   * (without real fullscreen) with the controls kept showing.
   */
  previewMode?: LayoutMode;
}

export function IslandVideoSkin({ children, className, style, previewMode, ...props }: IslandVideoSkinProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const realFullscreen = usePlayer(selectFullscreen)?.isFullscreen ?? false;
  const fullscreen = realFullscreen || previewMode === 'fs-desktop' || previewMode === 'fs-phone';
  const controlsVisible = usePlayer(selectControls)?.controlsVisible ?? true;
  const coarse = useCoarsePointer();
  const chapter = useCurrentChapter();
  const { w, h } = useSize(stageRef);

  const mode: LayoutMode = previewMode
    ? previewMode
    : fullscreen
    ? coarse || h < 520
      ? 'fs-phone'
      : 'fs-desktop'
    : w < PHONE_BELOW
      ? 'phone'
      : 'desktop';
  const frame = frameFor(mode, w, h);
  const { layout, u } = frame;

  useFullscreenOrientationLock(stageRef, realFullscreen);

  const screenStyle: CSSProperties | undefined =
    layout.screen === 'fill'
      ? undefined
      : {
          left: px(frame.ox + (layout.screen.x - layout.screen.w / 2 - layout.x0) * u),
          top: px(frame.oy + (layout.y1 - layout.screen.y - layout.screen.h / 2) * u),
          width: px(layout.screen.w * u),
          height: px(layout.screen.h * u),
        };

  return (
    <Container
      className={cn('video-skin', 'clay-skin', 'clay-island', className)}
      data-theme="default"
      data-preset="video"
      data-mode={mode}
      data-fs={fullscreen ? '' : undefined}
      data-idle={realFullscreen && !controlsVisible ? '' : undefined}
      data-preview={previewMode && !realFullscreen && fullscreen ? '' : undefined}
      style={style}
      {...props}
    >
      <ClayFonts />
      <div
        ref={stageRef}
        className={'ci-stage'}
        style={{ height: frame.height ? px(frame.height) : undefined, ['--ci-u' as string]: px(u) }}
      >
        <div className={'ci-screen'} style={screenStyle}>
          {children}
          <Poster />
          <BufferingIndicator />
          <VideoStatusIndicators />
        </div>

        {u > 0 ? (
          <Controls.Root>
            <Controls.Content className={cn('video-controls', 'ci-controls')} role="group" aria-label="Player controls">
              {layout.items.map((item, i) => {
                const side = sideOf(layout, item.x, item.y);
                if ('piece' in item) {
                  return (
                    <img
                      key={`${mode}-${item.piece}-${i}`}
                      className={'ci-item ci-piece'}
                      data-side={side}
                      src={SPRITES[item.piece].src}
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
                    key={item.spot}
                    className={cn('ci-item', 'ci-spot', `ci-spot--${item.spot}`)}
                    data-side={side}
                    style={itemStyle(frame, item)}
                  >
                    <SpotControl id={item.spot} chapter={chapter} />
                  </div>
                );
              })}
            </Controls.Content>
          </Controls.Root>
        ) : null}
      </div>

      <ErrorDialog />
      <VideoHotkeys />
      <VideoGestures />
    </Container>
  );
}
