/** @jsxImportSource react */

'use client';

// Papercut · Collage — the papercut skin as a scrapbook spread instead of a control bar. The picture is a photo taped
// down in the middle and every control is a scrap pinned around it: a red paper disc for play, ticket stubs for
// skipping, a torn strip with a googly eye for the timeline, a postage stamp for sound, a luggage tag for speed, a
// rubber stamp for captions, a folder tab for settings. Below a narrow width it re-lays itself out for a phone.
//
// Fullscreen drops the spread: the picture fills the screen and the scraps lie over its edges, showing while paused
// or while the viewer is active (Video.js's own controls visibility) and sliding off the edges when idle. On a touch
// screen the overlay keeps only what a phone needs on screen; speed, captions, quality and picture-in-picture move
// into a lined index card that fits the screen without scrolling.
//
// It reuses the papercut skin's controls from ../skin/ui and keeps its own layout and paper in ./collage.css, so it
// lives outside ../skin (which `npm run sync-skin -- papercut` replaces wholesale).
import {
  Controls,
  Menu,
  PlaybackRateButton,
  Time,
  useCaptionsOptions,
  usePlaybackRateOptions,
  usePlayer,
  useQualityOptions,
} from '@videojs/react';
import { selectControls, selectFullscreen, selectPlaybackRate, selectTextTrack, selectTime } from '@videojs/core/dom';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';

import { AudioTrackMenu } from '../skin/ui/audio-track-menu';
import { BufferingIndicator } from '../skin/ui/buffering-indicator';
import { Button } from '../skin/ui/button';
import { CaptionsButton } from '../skin/ui/captions-button';
import { CaptionsSubmenu } from '../skin/ui/captions-submenu';
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
import { SeekIndicator } from '../skin/ui/seek-indicator';
import { StatusAnnouncer } from '../skin/ui/status-announcer';
import { TimeSlider } from '../skin/ui/time-slider';
import { VolumeSlider } from '../skin/ui/volume-slider';
import { VideoGestures } from '../skin/video/behaviors/gestures';
import { VideoHotkeys } from '../skin/video/behaviors/hotkeys';
import { cn } from '../skin/lib/resolve-class-name';
import { useCaptionsAboveStrip, useFullscreenOrientationLock } from './collage-hooks';
// Last, so its layer is declared after the Default skin's layers (see the top of collage.css).
import './collage.css';

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&family=Special+Elite&display=swap';

/** Lumpy scissor-cut edges, with their own ids so this player can share a page with the other papercut players. */
function CollageFilters() {
  return (
    <>
      <link rel="stylesheet" href={FONT_URL} precedence="default" />
      <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="pcc-lumpy" x="-6%" y="-6%" width="112%" height="112%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={7} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={7} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="pcc-lumpy-sm" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves={2} seed={3} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={4} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="pcc-lumpy-xs" x="-5%" y="-40%" width="110%" height="180%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={1} seed={9} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={2.5} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
    </>
  );
}

/** The luggage tag: cycles the speed, with the current rate typed on it. */
function SpeedTag() {
  const rate = usePlayer(selectPlaybackRate)?.playbackRate ?? 1;
  return (
    <PlaybackRateButton render={<Button />} className={cn('pcc-piece', 'pcc-speed')}>
      <span className={'pcc-speed-hole'} aria-hidden="true" />
      <span className={'pcc-speed-label'}>
        <span className={'pcc-speed-rate'}>{rate}×</span>
        <span className={'pcc-speed-word'} aria-hidden="true">
          speed
        </span>
      </span>
    </PlaybackRateButton>
  );
}

function GearIcon() {
  return (
    <svg className={'pcc-icon'} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </svg>
  );
}

/** The folder tab: quality, audio, speed and captions, each shown only when the media offers it. */
function SettingsTab() {
  return (
    <Menu.Root side="top" align="end">
      <Menu.Trigger render={<Button />} className={cn('media-settings-menu-trigger', 'pcc-piece', 'pcc-settings')} aria-label="Settings">
        <GearIcon />
        <span className={'pcc-settings-word'}>Settings</span>
      </Menu.Trigger>
      <Menu.Popup
        keepMounted
        className={cn('media-popup', 'media-popup-surface', 'media-menu-popup', 'media-menu-resizable-popup', 'pcc-menu')}
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

const SPEED_CHIPS = ['0.5', '1', '1.25', '1.5', '2'] as const;

interface ChipOption {
  value: string;
  label: string;
  disabled: boolean;
}

interface ChipRowProps {
  title: string;
  result: { hidden: boolean; value: string; options: ChipOption[]; setValue: (value: string) => void } | null;
  typed?: boolean;
  /** Keeps only these values (when the media offers them), so the row stays one line on a phone. */
  only?: readonly string[];
}

/** One row of the settings card: a typed heading and a chip per option, the chosen one inked red. */
function ChipRow({ title, result, typed = false, only }: ChipRowProps) {
  if (!result || result.hidden) return null;
  const options = only
    ? result.options.filter((option) => only.includes(option.value) || option.value === result.value)
    : result.options;
  if (options.length < 2) return null;
  return (
    <div className={'pcc-card-row'} role="group" aria-label={title}>
      <span className={'pcc-card-heading'} aria-hidden="true">
        {title}
      </span>
      <div className={'pcc-card-chips'}>
        {options.map((option) => {
          const on = option.value === result.value;
          return (
            <button
              key={option.value}
              type="button"
              className={cn('pcc-chip', typed && 'pcc-chip--typed')}
              aria-pressed={on}
              data-on={on ? '' : undefined}
              disabled={option.disabled}
              onClick={() => result.setValue(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SettingsCardProps {
  onClose: () => void;
}

/**
 * Touch fullscreen settings: a lined index card that slides in from the right edge. Speed, captions and quality are
 * chips, picture-in-picture a single row, so it fits a landscape phone screen without scrolling. Escape, ✕ or a tap
 * on the picture closes it; focus moves into it on open and back to the gear on close.
 */
function SettingsCard({ onClose }: SettingsCardProps) {
  const rate = usePlaybackRateOptions();
  const captions = useCaptionsOptions();
  const quality = useQualityOptions();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus();
  }, []);

  return (
    <>
      <button type="button" className={'pcc-card-scrim'} aria-label="Close settings" tabIndex={-1} onClick={onClose} />
      <div
        ref={ref}
        className={'pcc-card'}
        role="dialog"
        aria-label="Settings"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
        }}
      >
        <div className={'pcc-card-head'}>
          <h2 className={'pcc-card-title'}>Settings</h2>
          <button type="button" className={cn('pcc-chip', 'pcc-card-close')} aria-label="Close settings" onClick={onClose}>
            ✕
          </button>
        </div>
        <ChipRow title="Speed" result={rate} typed only={SPEED_CHIPS} />
        <ChipRow title="Captions" result={captions} />
        <ChipRow title="Quality" result={quality} typed />
        <PiPButton className={'pcc-card-pip'} />
      </div>
    </>
  );
}

/** The chapter playing now, from the media's chapters track; null when it has none. */
function useCurrentChapter(): string | null {
  const cues = usePlayer(selectTextTrack)?.chaptersCues;
  const time = usePlayer(selectTime)?.currentTime ?? 0;
  return cues?.find((cue) => time >= cue.startTime && time < cue.endTime)?.text ?? null;
}

export interface CollageVideoSkinProps extends Omit<NonNullable<ComponentProps<typeof Container>>, 'children'> {
  children?: ReactNode;
  /** Typed on the stamp above the photo. */
  title?: string;
  /** Handwritten beside the title; the current chapter takes its place when the media has chapters. */
  subtitle?: string;
}

export function CollageVideoSkin({
  children,
  className,
  title = 'Papercut',
  subtitle = '— collage',
  ...props
}: CollageVideoSkinProps) {
  const chapter = useCurrentChapter();
  const fullscreen = usePlayer(selectFullscreen)?.isFullscreen ?? false;
  const controls = usePlayer(selectControls);
  const controlsVisible = controls?.controlsVisible ?? true;
  const requestLock = controls?.requestControlsLock;
  const [cardOpen, setCardOpen] = useState(false);
  const cardTrigger = useRef<HTMLButtonElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // The card only lives in fullscreen, and keeps the scraps up while it's open.
  useEffect(() => {
    if (!fullscreen) setCardOpen(false);
  }, [fullscreen]);
  useEffect(() => {
    if (!cardOpen || !requestLock) return;
    return requestLock();
  }, [cardOpen, requestLock]);

  // On a phone, fullscreen turns the screen to suit the video; captions move above the strip while it shows.
  useFullscreenOrientationLock(windowRef, fullscreen);
  useCaptionsAboveStrip(windowRef, fullscreen && controlsVisible);

  const closeCard = () => {
    setCardOpen(false);
    cardTrigger.current?.focus();
  };

  return (
    <Container
      className={cn('papercut-collage', className)}
      data-theme="default"
      data-fullscreen={fullscreen ? '' : undefined}
      data-idle={fullscreen && !controlsVisible ? '' : undefined}
      {...props}
    >
      <CollageFilters />

      <Controls.Root>
        <div className={'pcc-stage'}>
          {/* ---------- Backing (phone layout only): a manila folder with a sheet of graph paper ---------- */}
          <div className={'pcc-deco pcc-folder'} aria-hidden="true" />
          <div className={'pcc-deco pcc-folder-tab'} aria-hidden="true" />
          <div className={'pcc-deco pcc-sheet'} aria-hidden="true" />

          {/* ---------- The picture: a photo taped down in the middle (edge to edge in fullscreen) ---------- */}
          <div className={'pcc-photo'}>
            <div ref={windowRef} className={'pcc-window'}>
              {children}
              <Poster />
              <BufferingIndicator />
              <span className={'pcc-paused-stamp'} aria-hidden="true">
                Paused
              </span>
              <SeekIndicator className={'pcc-seek-flash'} />
            </div>
          </div>
          <span className={'pcc-deco pcc-tape pcc-tape--a'} aria-hidden="true" />
          <span className={'pcc-deco pcc-tape pcc-tape--b'} aria-hidden="true" />
          <svg className={'pcc-deco pcc-clip'} viewBox="0 0 90 80" aria-hidden="true">
            <path d="M24 6 C 6 6 6 40 30 44 M66 6 C 84 6 84 40 60 44" fill="none" stroke="#a39d92" strokeWidth="5" strokeLinecap="round" />
            <path d="M14 40 h62 l-6 34 h-50 z" fill="#2a2320" />
            <path d="M18 44 h54" stroke="#5a524c" strokeWidth="3" />
          </svg>

          {/* Fullscreen only: dark shades at the top and bottom keep the scraps readable over a bright picture. */}
          <div className={'pcc-shade pcc-shade--top'} aria-hidden="true" />
          <div className={'pcc-shade pcc-shade--bottom'} aria-hidden="true" />

          {/* ---------- Title stamp ---------- */}
          <div className={'pcc-piece pcc-title'}>
            <p className={'pcc-title-main'}>{title}</p>
          </div>
          <p className={'pcc-deco pcc-title-sub'} aria-hidden="true">
            {chapter ? `— ${chapter}` : subtitle}
          </p>

          {/* ---------- The controls, pinned around the photo ---------- */}
          <Controls.Content className={'pcc-controls'} role="group" aria-label="Player controls">
            <PlayButton className={cn('pcc-piece', 'pcc-play')} />
            <svg className={'pcc-deco pcc-paperclip'} viewBox="0 0 30 80" aria-hidden="true">
              <path d="M10 70 V 16 a8 8 0 0 1 16 0 V 62 a12 12 0 0 1 -24 0 V 24" fill="none" stroke="#a9a49c" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
            <span className={'pcc-deco pcc-play-word'} aria-hidden="true" />

            <SeekButton className={cn('pcc-piece', 'pcc-ticket', 'pcc-seek--back')} seconds={-10} />
            <SeekButton className={cn('pcc-piece', 'pcc-ticket', 'pcc-seek--fwd')} seconds={10} />

            <div className={cn('pcc-piece', 'pcc-strip')}>
              <TimeSlider />
            </div>
            <div className={cn('pcc-piece', 'pcc-time')}>
              <Time.Value className={cn('media-time-value', 'pcc-time-current')} type="current" />
              <span aria-hidden="true"> / </span>
              <Time.Value className={'media-time-value'} type="duration" />
            </div>

            <MuteButton className={cn('pcc-piece', 'pcc-stamp')} />
            <div className={cn('pcc-piece', 'pcc-volume')}>
              <VolumeSlider orientation="vertical" />
            </div>
            <span className={'pcc-deco pcc-volume-word'} aria-hidden="true">
              vol
            </span>

            <svg className={'pcc-deco pcc-string'} viewBox="0 0 60 120" aria-hidden="true">
              <path d="M30 0 C 10 40, 50 70, 34 118" fill="none" stroke="#c4a26a" strokeWidth="2" />
            </svg>
            <SpeedTag />

            <CaptionsButton className={cn('pcc-piece', 'pcc-cc')} />
            <SettingsTab />
            {/* Touch fullscreen swaps the folder tab's menu for the settings card. */}
            <Button
              ref={cardTrigger}
              type="button"
              className={cn('pcc-piece', 'pcc-card-trigger')}
              aria-label="Settings"
              aria-haspopup="dialog"
              aria-expanded={cardOpen}
              onClick={() => setCardOpen((open) => !open)}
            >
              <GearIcon />
            </Button>
            <PiPButton className={cn('pcc-piece', 'pcc-pip')} />
            <FullscreenButton className={cn('pcc-piece', 'pcc-fullscreen')} />
          </Controls.Content>

          {cardOpen ? <SettingsCard onClose={closeCard} /> : null}
        </div>
      </Controls.Root>

      <ErrorDialog />
      <StatusAnnouncer />
      <VideoHotkeys />
      <VideoGestures />
    </Container>
  );
}
