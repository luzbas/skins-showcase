/** @jsxImportSource react */

'use client';

// ASCII Glitch · Schematic — the ASCII skin laid out as a circuit diagram instead of a control bar. The video is the
// central node and every control is its own labelled unit wired into it: transport, audio, chapter index, timeline,
// config and output. Warm earthy palette (ochre, terracotta, sage on espresso), the same glyph screen as the main skin
// (ASCII while paused, the real picture while playing) and the same terminal chrome. On a narrow player the units
// stack above and below the feed.
//
// Fullscreen: the picture fills the screen and the board floats over it, shown while paused or active. On a phone
// (a narrow fullscreen) it becomes an edge-only overlay — title and option keys along the top, the timeline along the
// bottom, transport in the middle — with chapters and settings in drawers that scroll inside themselves, since a
// fullscreen page can't scroll. Taps show/hide it, double-taps on the sides skip. iPhone Safari can only fullscreen the
// bare <video> (with Apple's controls), so there the fullscreen key switches an "immersive" mode instead: the player
// covers the viewport and page scrolling is locked.
//
// It reuses the ASCII skin's controls from ../skin and keeps its own layout and colours in ./schematic.css, so it lives
// outside ../skin (which `npm run sync-skin -- ascii` replaces wholesale).
import {
  CaptionsButton,
  Gesture,
  PlaybackRateButton,
  PlayButton as PlayButtonPrimitive,
  Time,
  useAudioTrackOptions,
  useCaptionsOptions,
  usePlaybackRateOptions,
  usePlayer,
  useQualityOptions,
} from '@videojs/react';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/react/icons';
import { selectControls, selectFullscreen, selectPlaybackRate, selectTextTrack, selectTime } from '@videojs/core/dom';
import { useEffect, useRef, useState } from 'react';
import type { ComponentProps, KeyboardEvent, ReactNode } from 'react';

import { AirPlayButton } from '../skin/ui/airplay-button';
import { AsciiFonts } from '../skin/ui/ascii-fonts';
import { BufferingIndicator } from '../skin/ui/buffering-indicator';
import { Button } from '../skin/ui/button';
import { CaptionsButton as CaptionsKey } from '../skin/ui/captions-button';
import { CastButton } from '../skin/ui/cast-button';
import { Container } from '../skin/ui/container';
import { ErrorDialog } from '../skin/ui/error-dialog';
import { FullscreenButton } from '../skin/ui/fullscreen-button';
import { MuteButton } from '../skin/ui/mute-button';
import { PiPButton } from '../skin/ui/pip-button';
import { PlayButton } from '../skin/ui/play-button';
import { Poster } from '../skin/ui/poster';
import { SeekButton } from '../skin/ui/seek-button';
import { TimeSlider } from '../skin/ui/time-slider';
import { VolumeSlider } from '../skin/ui/volume-slider';
import { VideoHotkeys } from '../skin/video/behaviors/hotkeys';
import { AsciiCaptions } from '../skin/video/display/ascii-captions';
import { AsciiScreen } from '../skin/video/display/ascii-screen';
import { AsciiStage } from '../skin/video/display/ascii-stage';
import { VideoStatusIndicators } from '../skin/video/display/status-indicators';
import { VideoSettingsMenu } from '../skin/video/menus/settings-menu';
import { cn } from '../skin/lib/resolve-class-name';
// The ASCII skin's look first, then this layout's, so its layer is declared after (see the top of schematic.css).
import '../skin/styles/ascii.css';
import './schematic.css';

type Drawer = 'chapters' | 'settings' | null;

export function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Whether this browser can fullscreen an element (not just a bare <video>, as on iPhone). */
export function canFullscreenElements() {
  if (typeof document === 'undefined') return true;
  const doc = document as Document & { webkitFullscreenEnabled?: boolean };
  return Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
}

/** One labelled unit on the board. `chip` names the wire that leaves it. */
function Unit({ area, title, chip, children }: { area: string; title: string; chip?: string; children: ReactNode }) {
  return (
    <div className={cn('sx-unit', `sx-${area}`)} role="group" aria-label={title} data-chip={chip}>
      <p className={'sx-unit-title'} aria-hidden="true">
        ▌{title}
      </p>
      <div className={'sx-unit-body'}>{children}</div>
    </div>
  );
}

/** The chapter playing now, from the media's chapters track. */
export function useChapters() {
  const cues = usePlayer(selectTextTrack)?.chaptersCues ?? [];
  const time = usePlayer(selectTime);
  const now = time?.currentTime ?? 0;
  const active = cues.findIndex((cue) => now >= cue.startTime && now < cue.endTime);
  return { cues, active, seek: time?.seek };
}

/** INDEX: CHAPTERS — every chapter as a row; the playing one is marked, and a row jumps there. */
export function ChapterIndex({ onPick }: { onPick?: () => void }) {
  const { cues, active, seek } = useChapters();
  if (!cues.length) return <p className={'sx-empty'}>&gt; no chapters on this signal</p>;
  return (
    <ol className={'sx-chapter-list'}>
      {cues.map((cue, index) => (
        <li key={`${cue.startTime}-${index}`}>
          <button
            type="button"
            className={cn('sx-row', index === active && 'is-active')}
            aria-current={index === active ? 'true' : undefined}
            title={cue.text}
            onClick={() => {
              seek?.(cue.startTime);
              onPick?.();
            }}
          >
            <span className={'sx-row-label'}>
              {index === active ? '> ' : ''}
              {String(index + 1).padStart(2, '0')} {cue.text}
            </span>
            <span className={'sx-row-value'}>{formatTime(cue.startTime)}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** Speed: cycles the playback rate, with the current rate on the row. */
function SpeedRow() {
  const rate = usePlayer(selectPlaybackRate)?.playbackRate ?? 1;
  return (
    <PlaybackRateButton render={<Button />} className={'sx-row'}>
      <span className={'sx-row-label'}>speed</span>
      <span className={'sx-row-value'}>{rate.toFixed(rate % 1 ? 2 : 1)}× &gt;</span>
    </PlaybackRateButton>
  );
}

/** Captions: toggles the subtitles, as a terminal checkbox. */
function CaptionsRow() {
  return (
    <CaptionsButton render={<Button />} className={'sx-row sx-cc-row'}>
      <span className={'sx-row-label'}>captions</span>
      <span className={'sx-row-value'}>
        <span className={'sx-cc-on'}>[x] on</span>
        <span className={'sx-cc-off'}>[ ] off</span>
      </span>
    </CaptionsButton>
  );
}

/** Fullscreen, or on iPhone (no element fullscreen) the immersive mode instead. */
function FullscreenKey({ immersive, onImmersive }: { immersive: boolean; onImmersive: () => void }) {
  if (canFullscreenElements()) return <FullscreenButton />;
  return (
    <Button
      type="button"
      className={cn('media-fullscreen-button', 'sx-immersive-key')}
      aria-label={immersive ? 'Exit fullscreen' : 'Enter fullscreen'}
      aria-pressed={immersive}
      onClick={onImmersive}
    >
      {immersive ? (
        <FullscreenExitIcon className={'media-button-icon'} />
      ) : (
        <FullscreenEnterIcon className={'media-button-icon'} />
      )}
    </Button>
  );
}

interface RadioGroupResult {
  value: string;
  hidden: boolean;
  options: { value: string; label: unknown; disabled?: boolean }[];
  setValue: (value: string) => void;
}

/** One settings group in the drawer: a row of terminal keys, the chosen one filled. */
function OptionGroup({ title, result }: { title: string; result: RadioGroupResult | null }) {
  if (!result || result.hidden || !result.options.length) return null;
  return (
    <div className={'sx-option-group'} role="group" aria-label={title}>
      <p className={'sx-option-title'} aria-hidden="true">
        &gt; {title}
      </p>
      <div className={'sx-option-keys'}>
        {result.options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={'sx-option'}
            aria-pressed={option.value === result.value}
            disabled={option.disabled}
            onClick={() => result.setValue(option.value)}
          >
            {String(option.label)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsGroups() {
  return (
    <>
      <OptionGroup title="speed" result={usePlaybackRateOptions()} />
      <OptionGroup title="quality" result={useQualityOptions()} />
      <OptionGroup title="captions" result={useCaptionsOptions()} />
      <OptionGroup title="audio track" result={useAudioTrackOptions()} />
    </>
  );
}

/** A drawer from the right edge: the only part of a phone fullscreen that scrolls. */
function DrawerPanel({
  open,
  title,
  label,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
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
    <div className={'sx-drawer'} role="dialog" aria-label={label} hidden={!open} onKeyDown={onKeyDown}>
      <div className={'sx-drawer-head'}>
        <p className={'sx-unit-title'} aria-hidden="true">
          ▌{title}
        </p>
        <button ref={closeRef} type="button" className={'sx-drawer-close'} aria-label={`Close ${label.toLowerCase()}`} onClick={onClose}>
          ✕
        </button>
      </div>
      <div className={'sx-drawer-body'}>{children}</div>
      <p className={'sx-drawer-hint'} aria-hidden="true">
        ↕ only this panel scrolls · tap the picture to close
      </p>
    </div>
  );
}

export interface SchematicVideoSkinProps extends Omit<NonNullable<ComponentProps<typeof Container>>, 'children'> {
  children?: ReactNode;
  /** Shown in the header. */
  title?: string;
}

export function SchematicVideoSkin({ children, className, title = 'Signal', ...props }: SchematicVideoSkinProps) {
  const { cues, active } = useChapters();
  const chapter = active >= 0 ? cues[active]?.text : null;

  const boardRef = useRef<HTMLDivElement>(null);
  const isFullscreen = usePlayer(selectFullscreen)?.isFullscreen ?? false;
  const controls = usePlayer(selectControls);
  const [immersive, setImmersive] = useState(false);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const fullscreenish = isFullscreen || immersive;

  // Drawers only exist over a fullscreen picture; leaving it closes them.
  useEffect(() => {
    if (!fullscreenish) setDrawer(null);
  }, [fullscreenish]);

  // Keep the overlay up while a drawer is open, so it doesn't fade out from under the person using it.
  const requestLock = controls?.requestControlsLock;
  useEffect(() => {
    if (!drawer || !requestLock) return undefined;
    return requestLock();
  }, [drawer, requestLock]);

  // Phones: hold landscape while fullscreen, and let the player use the whole screen around the notch (the overlay
  // keeps itself inside the safe area with env(safe-area-inset-*)).
  useEffect(() => {
    if (!fullscreenish) return undefined;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const before = meta?.content;
    if (meta && before && !before.includes('viewport-fit')) meta.content = `${before}, viewport-fit=cover`;

    const orientation = screen.orientation as ScreenOrientation & { lock?: (type: string) => Promise<void> };
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (isFullscreen && coarse && typeof orientation?.lock === 'function') orientation.lock('landscape').catch(() => {});

    return () => {
      if (meta && before !== undefined) meta.content = before;
      if (isFullscreen && coarse) {
        try {
          orientation?.unlock?.();
        } catch {
          /* not supported */
        }
      }
    };
  }, [fullscreenish, isFullscreen]);

  // Immersive (iPhone): lock page scrolling underneath, and Escape leaves it.
  useEffect(() => {
    if (!immersive) return undefined;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setImmersive(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      root.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [immersive]);

  const toggleImmersive = () => setImmersive((value) => !value);
  const closeDrawer = () => setDrawer(null);

  return (
    <Container
      className={cn('ascii-skin', 'ascii-schematic', className)}
      data-theme="default"
      data-immersive={immersive ? '' : undefined}
      data-drawer={drawer ?? undefined}
      {...props}
    >
      <AsciiFonts />

      <div ref={boardRef} className={cn('video-controls', 'sx-board')}>
        {/* ---------- Header ---------- */}
        <div className={cn('sx-unit-bare', 'sx-head')} data-chip="IN-00">
          <p className={'sx-title'}>
            {title.toUpperCase().replace(/\s+/g, '_')}
            <span className={'ax-cursor'} aria-hidden="true">
              _
            </span>
          </p>
          <p className={'sx-sub'}>&gt; {chapter ? `ch: ${chapter}` : 'origin unclear // archive ref 7a-991'}</p>
          <p className={'sx-status'} aria-hidden="true">
            SYS:SCAN0 · P_NODE=04 · STATUS: <span className={'sx-st-play'}>PLAYING</span>
            <span className={'sx-st-pause'}>PAUSED</span>
          </p>
          <p className={'sx-rotate-hint'} aria-hidden="true">
            ↻ turn your phone for the full picture
          </p>
        </div>

        {/* ---------- Phone fullscreen only: option keys along the top edge ---------- */}
        <div className={'sx-fs-keys'} role="group" aria-label="Player options">
          <CaptionsKey />
          <button
            type="button"
            className={cn('media-button', 'sx-key', drawer === 'settings' && 'is-open')}
            aria-label="Settings"
            aria-expanded={drawer === 'settings'}
            onClick={() => setDrawer(drawer === 'settings' ? null : 'settings')}
          >
            <svg className={'media-button-icon'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
              <rect x="14" y="5" width="4" height="4" />
              <rect x="6" y="15" width="4" height="4" />
            </svg>
          </button>
          <PiPButton />
          <FullscreenKey immersive={immersive} onImmersive={toggleImmersive} />
        </div>

        {/* ---------- The feed: the video, central node ---------- */}
        <div className={cn('sx-unit', 'sx-feed')} role="group" aria-label="Video">
          <p className={'sx-unit-title'} aria-hidden="true">
            ▌INPUT CHANNEL: 00 // LIVE FEED
          </p>
          <div className={'sx-screen'}>
            {children}
            <AsciiScreen />
            <Poster />
            {/* Click the picture to play or pause: a mouse shortcut (touch taps show and hide the overlay instead); the
                transport's button is the one in the tab order. */}
            <PlayButtonPrimitive className={'sx-surface'} tabIndex={-1} aria-hidden="true" />
            <AsciiCaptions />
            <AsciiStage />
            <BufferingIndicator />
            <VideoStatusIndicators />
          </div>
        </div>

        {/* ---------- Units around it ---------- */}
        <Unit area="transport" title="Unit: transport" chip="T1">
          <div className={'sx-transport-keys'}>
            <SeekButton seconds={-10} />
            <PlayButton className={'sx-main-play'} />
            <SeekButton seconds={10} />
          </div>
          <p className={'sx-hint'} aria-hidden="true">
            $ space · ← → · m · c · f
          </p>
        </Unit>

        <Unit area="audio" title="Audio ch: 03" chip="A-03">
          <div className={'sx-audio-row'}>
            <MuteButton />
            <VolumeSlider />
          </div>
          <span className={'sx-meter'} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        </Unit>

        <Unit area="chapters" title="Index: chapters" chip="BUS">
          <ChapterIndex />
        </Unit>

        <Unit area="timeline" title="Record: 91-A // timeline" chip="TL">
          <div className={'sx-timeline-row'}>
            <Time.Value className={cn('media-time-value', 'sx-time')} type="current" />
            <TimeSlider />
            <Time.Value className={cn('media-time-toggle', 'sx-time')} type="remaining" toggle />
            {/* Phone fullscreen only: opens the chapters drawer. */}
            <button
              type="button"
              className={cn('sx-ch-key', drawer === 'chapters' && 'is-open')}
              aria-label="Chapters"
              aria-expanded={drawer === 'chapters'}
              onClick={() => setDrawer(drawer === 'chapters' ? null : 'chapters')}
            >
              ≡ CH
            </button>
          </div>
        </Unit>

        <Unit area="config" title="Data cluster: config" chip="C/4">
          <SpeedRow />
          <CaptionsRow />
          <div className={'sx-row sx-more-row'}>
            <span className={'sx-row-label'}>quality · more</span>
            <VideoSettingsMenu />
          </div>
        </Unit>

        <Unit area="output" title="Output: view" chip="OUT">
          <div className={'sx-output-keys'}>
            <PiPButton />
            <CastButton />
            <AirPlayButton />
            <FullscreenKey immersive={immersive} onImmersive={toggleImmersive} />
          </div>
        </Unit>

        <p className={'sx-foot'} aria-hidden="true">
          : signal intact · fragment remains<span className={'ax-cursor'}>_</span>
        </p>
      </div>

      {/* ---------- Phone fullscreen: drawers from the right edge ---------- */}
      {drawer ? <button type="button" className={'sx-scrim'} tabIndex={-1} aria-hidden="true" onClick={closeDrawer} /> : null}
      <DrawerPanel open={drawer === 'chapters'} title="Index: chapters" label="Chapters" onClose={closeDrawer}>
        <ChapterIndex onPick={closeDrawer} />
      </DrawerPanel>
      <DrawerPanel open={drawer === 'settings'} title="Data cluster: config" label="Settings" onClose={closeDrawer}>
        <SettingsGroups />
      </DrawerPanel>

      {/* Touch, in fullscreen: a tap shows or hides the overlay, a double-tap on either side skips 10s. */}
      <Gesture disabled={!fullscreenish} type="tap" action="toggleControls" pointer="touch" />
      <Gesture disabled={!fullscreenish} type="doubletap" action="seekStep" region="left" pointer="touch" />
      <Gesture disabled={!fullscreenish} type="doubletap" action="seekStep" region="right" pointer="touch" />

      <ErrorDialog />
      <VideoHotkeys />
    </Container>
  );
}
