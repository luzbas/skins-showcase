/** @jsxImportSource react */

'use client';

// Papercut · Duo — the papercut skin laid out for the iPhone Duo's inner display (portrait, 626 × 890 pt).
// Video on the top half, a construction-paper control board on the bottom half, nothing on the crease (y = 445).
// It reuses the papercut skin's controls from ../skin/ui and adds its own layout and paper in ./duo.css, so it lives
// outside ../skin (which `npm run sync-skin -- papercut` replaces wholesale).
import { Controls, Menu, Time, useMedia, usePlayer } from '@videojs/react';
import { selectControls, selectPiP, selectTextTrack, selectTime } from '@videojs/core/dom';
import { CheckIcon, FullscreenEnterIcon, FullscreenExitIcon, GearIcon, PipEnterIcon } from '@videojs/react/icons';
import {
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from 'react';

import { AudioTrackMenu } from '../skin/ui/audio-track-menu';
import { Poster } from '../skin/ui/poster';
import { BufferingIndicator } from '../skin/ui/buffering-indicator';
import { CaptionsButton } from '../skin/ui/captions-button';
import { CaptionsSubmenu } from '../skin/ui/captions-submenu';
import { Button } from '../skin/ui/button';
import { Container } from '../skin/ui/container';
import { FullscreenButton } from '../skin/ui/fullscreen-button';
import { MuteButton } from '../skin/ui/mute-button';
import { PlayButton } from '../skin/ui/play-button';
import { PlaybackRateSubmenu } from '../skin/ui/playback-rate-submenu';
import { QualityMenu } from '../skin/ui/quality-menu';
import { SeekButton } from '../skin/ui/seek-button';
import { TimeSlider } from '../skin/ui/time-slider';
import { VideoHotkeys } from '../skin/video/behaviors/hotkeys';
import { cn } from '../skin/lib/resolve-class-name';
import { foldableAttributes, useFoldable } from '../../../duo-kit/foldable';
import { SimulatedFullscreen, duoLayoutFor, useFullscreenOrientationLock, type DuoLayout } from '../../../duo-kit/duo-shared';
// Last, so its layer is declared after the Default skin's layers (see the top of duo.css).
import './duo.css';
import { DuoWallpaper } from './duo-wallpaper';

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&display=swap';

/** Lumpy scissor-cut edges, with their own ids so this player can sit on the same page as the regular papercut one. */
function DuoPaperFilters() {
  return (
    <>
      <link rel="stylesheet" href={FONT_URL} precedence="default" />
      <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="pcd-lumpy" x="-10%" y="-20%" width="120%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={9} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={7} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="pcd-lumpy-sm" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves={2} seed={31} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={3.5} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="pcd-lumpy-xs" x="-5%" y="-40%" width="110%" height="180%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={1} seed={7} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={2.5} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
    </>
  );
}

/** The ✕ tile: Duo apps close the player here. On a demo there's nothing to close to, so it stops and rewinds. */
function StopButton() {
  const media = useMedia() as unknown as { pause?: () => void; currentTime?: number } | null;
  return (
    <Button
      type="button"
      className={cn('pcd-tile', 'pcd-stop')}
      aria-label="Stop and rewind"
      onClick={() => {
        media?.pause?.();
        if (media) media.currentTime = 0;
      }}
    >
      <svg className={'media-button-icon'} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.5 6.2 17.6 17.5M17.4 6.4 6.3 17.7" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      </svg>
    </Button>
  );
}

export { SimulatedFullscreen, duoLayoutFor, fullscreenOrientationFor, useFullscreenOrientationLock } from '../../../duo-kit/duo-shared';
export type { DuoLayout, SimulatedFullscreenValue } from '../../../duo-kit/duo-shared';

/** The fullscreen button: real fullscreen on a page, the simulated kind inside the Duo mockup. */
function DuoFullscreenButton() {
  const simulated = useContext(SimulatedFullscreen);
  if (!simulated) return <FullscreenButton className={cn('pcd-tile', 'pcd-fullscreen')} />;
  return (
    <Button
      type="button"
      className={cn('media-fullscreen-button', 'pcd-tile', 'pcd-fullscreen')}
      data-fullscreen={simulated.active ? '' : undefined}
      aria-label={simulated.active ? 'Exit fullscreen' : 'Enter fullscreen'}
      onClick={simulated.toggle}
    >
      <FullscreenEnterIcon className={cn('media-button-icon', 'media-fullscreen-button-enter-icon')} />
      <FullscreenExitIcon className={cn('media-button-icon', 'media-fullscreen-button-exit-icon')} />
    </Button>
  );
}

/** The chapter playing now, from the media's chapters track; null when it has none. */
function useCurrentChapter(): string | null {
  const cues = usePlayer(selectTextTrack)?.chaptersCues;
  const time = usePlayer(selectTime)?.currentTime ?? 0;
  return cues?.find((cue) => time >= cue.startTime && time < cue.endTime)?.text ?? null;
}

/**
 * Keeps captions clear of the full-screen layout's control strip. Browsers don't let CSS move native captions, so
 * while the strip shows, each subtitle cue is moved up a few caption lines (VTTCue.line = -5) so it clears the strip, and
 * goes back to its own position when the controls hide or another layout takes over.
 */
export function useCaptionsAboveStrip(ref: RefObject<HTMLElement | null>, lift: boolean) {
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    // The streaming player inserts its <video> after mount, so look it up each time rather than once.
    const apply = () => {
      const video = host.querySelector('video');
      if (!video) return;
      const target = lift ? -5 : 'auto';
      for (const track of Array.from(video.textTracks)) {
        if (track.kind !== 'subtitles' && track.kind !== 'captions') continue;
        const active = new Set(Array.from(track.activeCues ?? []));
        let movedOnScreen = false;
        for (const cue of Array.from(track.cues ?? [])) {
          if (!('line' in cue) || (cue as VTTCue).line === target) continue;
          (cue as VTTCue).line = target;
          if (active.has(cue)) movedOnScreen = true;
        }
        // A caption already on screen keeps its old place until the browser lays captions out again; re-showing the
        // track makes it do that now (otherwise a paused video would leave it sitting on the strip).
        if (movedOnScreen && track.mode === 'showing') {
          track.mode = 'hidden';
          track.mode = 'showing';
        }
      }
    };
    apply();
    // Media events don't bubble, so listen in the capture phase. New cues load as the stream plays and when the
    // language changes; timeupdate and loadedmetadata catch both.
    host.addEventListener('timeupdate', apply, true);
    host.addEventListener('loadedmetadata', apply, true);
    return () => {
      host.removeEventListener('timeupdate', apply, true);
      host.removeEventListener('loadedmetadata', apply, true);
    };
  }, [ref, lift]);
}

/** Picture-in-picture as a menu option: rarely used on a phone, so it doesn't get a button of its own. */
function PipMenuItem() {
  const pip = usePlayer(selectPiP);
  if (!pip || (!pip.isPictureInPicture && pip.pictureInPictureAvailability !== 'available')) return null;
  return (
    <Menu.CheckboxItem
      className={cn('media-menu-trigger-item', 'pcd-menu-check')}
      checked={pip.isPictureInPicture}
      onCheckedChange={(on) => void (on ? pip.requestPictureInPicture() : pip.exitPictureInPicture())}
    >
      <PipEnterIcon className={'media-menu-trigger-item-icon'} />
      <span>Picture in picture</span>
      <Menu.ItemIndicator forceMount className={'media-menu-item-indicator'}>
        <CheckIcon className={'media-menu-radio-item-icon'} />
      </Menu.ItemIndicator>
    </Menu.CheckboxItem>
  );
}

interface DuoSettingsMenuProps {
  layout: DuoLayout;
  /** Keeps the menu on one side of the fold: the board's own box in the split layout. */
  boundary: HTMLElement | null;
}

/**
 * The paper settings gear. Quality, audio track, speed and captions each appear only when the media offers them
 * (Video.js hides an empty section); picture-in-picture appears when the browser supports it. No tooltip: phones
 * don't hover.
 */
function DuoSettingsMenu({ layout, boundary }: DuoSettingsMenuProps) {
  const onRail = layout.startsWith('outer');
  // In the split (tabletop) layout the menu opens on the board itself rather than in the browser's top layer, which
  // is always drawn flat over the page. As an ordinary child of the board it lies on the bottom half and tilts with
  // it. Video.js then can't show it as a popover (it tries, and quietly gives up), so the CSS places it instead
  // (see "Settings menu on the board" in duo.css).
  const onBoard = layout === 'split';
  // Controlled so a layout change closes it: the menu can't move between the board and the top layer while open.
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [layout]);
  return (
    <Menu.Root
      open={open}
      onOpenChange={setOpen}
      side={onRail ? 'left' : 'top'}
      align="end"
      boundary={layout === 'split' && boundary ? boundary : 'container'}
    >
      <Menu.Trigger
        render={<Button />}
        className={cn('media-settings-menu-trigger', 'pcd-tile', 'pcd-settings')}
        aria-label="Settings"
      >
        <GearIcon className={'media-button-icon'} />
      </Menu.Trigger>
      <Menu.Popup
        keepMounted
        className={cn('media-popup', 'media-popup-surface', 'media-menu-popup', 'media-menu-resizable-popup', 'pcd-menu')}
        data-on-board={onBoard ? '' : undefined}
        {...(onBoard ? { popover: undefined } : {})}
      >
        <Menu.Content className={'media-menu-content'}>
          <QualityMenu />
          <AudioTrackMenu />
          <PlaybackRateSubmenu />
          <CaptionsSubmenu />
          <PipMenuItem />
        </Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  );
}

export interface DuoVideoSkinProps extends Omit<NonNullable<ComponentProps<typeof Container>>, 'children'> {
  children?: ReactNode;
  title?: string;
  subtitle?: string;
}

export function DuoVideoSkin({
  children,
  className,
  style,
  title = 'Duo demo',
  subtitle = 'Video.js 10 · Duo layout',
  ...props
}: DuoVideoSkinProps) {
  const ref = useRef<HTMLDivElement>(null);
  const foldable = useFoldable(ref);
  const { style: segmentStyle, ...foldAttributes } = foldableAttributes(foldable);
  const layout = duoLayoutFor(foldable);
  const tableInSim = layout === 'split' && foldable.simulated;
  // Simulated fullscreen on the closed phone: the outer display gives the whole screen to the picture (duo.css).
  const simulatedFullscreen = useContext(SimulatedFullscreen);
  const outerFullscreen = layout.startsWith('outer') && (simulatedFullscreen?.active ?? false);
  const chapter = useCurrentChapter();
  const controlsVisible = usePlayer(selectControls)?.controlsVisible ?? true;
  useCaptionsAboveStrip(ref, layout === 'full' && controlsVisible);
  useFullscreenOrientationLock(ref, foldable.fullscreen);
  const [board, setBoard] = useState<HTMLElement | null>(null);

  return (
    <Container
      className={cn('papercut-duo', className)}
      data-theme="default"
      data-layout={layout}
      data-outer-fullscreen={outerFullscreen ? '' : undefined}
      {...foldAttributes}
      style={{ ...segmentStyle, ...(typeof style === 'object' ? style : {}) }}
      {...props}
    >
      <DuoPaperFilters />
      {/* Outer · portrait only: cut-paper shapes in the space above the title and below the timeline. */}
      <DuoWallpaper />

      {/* ---------- Top half: just the picture, fitted edge to edge ---------- */}
      <div ref={ref} className={'pcd-top'}>
        <div className={'pcd-video'}>
          {children}
          {/* The poster (the stream's thumbnail) until playback starts, sized to the picture's box. */}
          <Poster />
          <BufferingIndicator />
        </div>
      </div>

      {/* The fold. A design aid and a seam in the paper; nothing interactive sits on it. */}
      <div className={'pcd-crease'} aria-hidden="true" />

      {/* ---------- Bottom half: the paper control board ---------- */}
      {/* Controls.Content reports whether the controls should show (data-visible). Only the full-screen layout
          (inner landscape) hides them while playing; the others keep the board up. */}
      <Controls.Root>
        <Controls.Content ref={setBoard} className={'pcd-board'} role="group" aria-label="Player controls">
          {/* In the simulation's tabletop (Table) the propped-up phone is already its own little screen, so there's no
              fullscreen button there; the title takes its place. On a real Duo the split layout only appears in
              fullscreen, where the button is the way out, so it stays. */}
          <div className={'pcd-row pcd-row--head'} data-no-fullscreen={tableInSim ? '' : undefined}>
            <StopButton />
            <div className={cn('pcd-tile', 'pcd-title')}>
              <p className={'pcd-title-main'}>{title}</p>
              {/* The current chapter when the media has chapters, so you know where you are. */}
              <p className={'pcd-title-sub'}>{chapter ?? subtitle}</p>
            </div>
            {tableInSim ? null : <DuoFullscreenButton />}
          </div>

          <div className={'pcd-row pcd-row--transport'}>
            <SeekButton className={cn('pcd-tile', 'pcd-seek', 'pcd-seek--back')} seconds={-10} />
            <PlayButton className={cn('pcd-tile', 'pcd-play')} />
            <SeekButton className={cn('pcd-tile', 'pcd-seek', 'pcd-seek--fwd')} seconds={10} />
          </div>

          <div className={cn('pcd-tile', 'pcd-timeline')}>
            <Time.Value className={cn('media-time-value', 'pcd-time')} type="current" />
            <TimeSlider />
            <Time.Value className={cn('media-time-toggle', 'pcd-time')} type="remaining" toggle />
          </div>

          <div className={'pcd-row pcd-row--extras'}>
            <MuteButton className={cn('pcd-tile', 'pcd-mute')} />
            {/* Hides itself (data-hidden) when the media has no captions; the row closes up. */}
            <CaptionsButton className={cn('pcd-tile', 'pcd-cc')} />
            <DuoSettingsMenu layout={layout} boundary={board} />
          </div>
        </Controls.Content>
      </Controls.Root>

      {/* Outer display only: the trailing edge rail and the camera cutout at its top. */}
      <div className={'pcd-rail'} aria-hidden="true" />
      <div className={'pcd-camera'} aria-hidden="true" />

      <VideoHotkeys />
    </Container>
  );
}
