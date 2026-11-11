/** @jsxImportSource react */

'use client';

// Sketch · Duo — the pencil schematic laid out for the iPhone Duo. Same three situations as Papercut · Duo, chosen the
// same way (from the device posture and viewport segments, see src/foldable):
//   split    folded flat on a table: the picture on the top half, a paper board of parts on the bottom half
//   full     a flat screen: the picture edge to edge, the parts drawn over it inside a pencil frame, hiding when idle
//   outer-*  the closed phone's outer display: the picture as a chip on paper, a rail of parts on the trailing edge
// It reuses the Sketch skin's parts from ../skin and lives outside it, because `npm run sync-skin -- sketch` replaces
// ../skin wholesale.
import {
  Container as ContainerPrimitive,
  Controls,
  FullscreenButton as FullscreenButtonPrimitive,
  Menu,
  SeekButton as SeekButtonPrimitive,
  Time,
  usePlayer,
} from '@videojs/react';
import { selectControls, selectTextTrack, selectTime } from '@videojs/core/dom';
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { foldableAttributes, useFoldable } from '../../../duo-kit/foldable';
import { SimulatedFullscreen, duoLayoutFor, useFullscreenOrientationLock, type DuoLayout } from '../../../duo-kit/duo-shared';
import { cn } from '../skin/lib/resolve-class-name';
import { VideoHotkeys } from '../skin/video/behaviors/hotkeys';
import { FullscreenEnterIcon, FullscreenExitIcon, GearIcon } from '../skin/video/icons';
import { Button } from '../skin/video/shared/button';
import { CaptionsButton } from '../skin/video/shared/captions-button';
import { ErrorDialog } from '../skin/video/shared/error-dialog';
import { Indicators } from '../skin/video/shared/indicators';
import { MuteButton } from '../skin/video/shared/mute-button';
import { PlayButton } from '../skin/video/shared/play-button';
import { SeekIndicator } from '../skin/video/shared/seek-indicator';
import { AudioTrackMenu, CaptionsMenu, PlaybackRateMenu, QualityMenu } from '../skin/video/shared/settings-menu';
import { StatusAnnouncer } from '../skin/video/shared/status-announcer';
import { TimeSlider } from '../skin/video/shared/time-slider';
import { BufferingIndicator, Poster } from '../skin/video/shared/video-feedback';
import { SketchFrame, SketchLead, SketchSurface } from '../skin/video/sketch/drawing';
import { VideoCaptions } from '../skin/video/sketch/schematic';
// The Sketch skin's styles: its main skin normally brings them in. Imported here too so the page stands on its own.
import '../skin/video/fonts/plex-mono.css';
import '../skin/styles/video/scaffold.css';
import '../skin/video/skin.css';
import '../skin/video/sketch.css';
import '../skin/video/board.css';
import './duo.css';
import { DuoWallpaper } from './wallpaper';

/** The chapter playing now, from the media's chapters track; null when it has none. */
function useCurrentChapter(): string | null {
  const cues = usePlayer(selectTextTrack)?.chaptersCues;
  const time = usePlayer(selectTime)?.currentTime ?? 0;
  return cues?.find((cue) => time >= cue.startTime && time < cue.endTime)?.text ?? null;
}

/** A part with its silkscreen reference printed under it (the labels hide where there's no room for them). */
function Part({ name, label, children }: { name: string; label: ReactNode; children: ReactNode }) {
  return (
    <div className={cn('sdu-part', `sdu-part-${name}`)}>
      {children}
      <span className={cn('sketch-label', 'sdu-label')} aria-hidden="true">
        {label}
      </span>
    </div>
  );
}

function SeekPad({ seconds }: { seconds: number }) {
  return (
    <SeekButtonPrimitive render={<Button pad />} className={cn('sketch-pad', 'sdu-seek')} seconds={seconds}>
      <span className={'sketch-pad-text'} aria-hidden="true">
        {seconds < 0 ? '−' : '+'}
        {Math.abs(seconds)}s
      </span>
    </SeekButtonPrimitive>
  );
}

/** Real fullscreen on a page; inside the Duo mockup, the simulation's own (it turns the drawn phone). */
function DuoFullscreenButton() {
  const simulated = useContext(SimulatedFullscreen);
  const icons = (
    <>
      <FullscreenEnterIcon className={cn('media-button-icon', 'media-fullscreen-button-enter-icon')} />
      <FullscreenExitIcon className={cn('media-button-icon', 'media-fullscreen-button-exit-icon')} />
    </>
  );
  if (!simulated) {
    return (
      <FullscreenButtonPrimitive render={<Button connector />} className={'media-fullscreen-button'}>
        {icons}
      </FullscreenButtonPrimitive>
    );
  }
  return (
    <Button
      type="button"
      connector
      className={'media-fullscreen-button'}
      data-fullscreen={simulated.active ? '' : undefined}
      aria-label={simulated.active ? 'Exit fullscreen' : 'Enter fullscreen'}
      onClick={simulated.toggle}
    >
      {icons}
    </Button>
  );
}

/**
 * The settings connector and its menu: quality, audio, speed and captions, each only when the media offers it.
 * Split, the menu is an ordinary child of the board rather than a top-layer popover, so it lies on the bottom half
 * and tilts with it (duo.css places it); on the rail it opens to the left, elsewhere above.
 */
function DuoSettingsMenu({ layout, boundary }: { layout: DuoLayout; boundary: HTMLElement | null }) {
  const onRail = layout.startsWith('outer');
  const onBoard = layout === 'split';
  // Controlled so a layout change closes it: the menu can't move between the board and the top layer while open.
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [layout]);
  return (
    <Menu.Root
      open={open}
      onOpenChange={setOpen}
      side={onRail ? 'left' : 'top'}
      align={onRail ? 'center' : 'end'}
      boundary={onBoard && boundary ? boundary : 'container'}
    >
      <Menu.Trigger render={<Button connector />} className={'sdu-settings'} aria-label="Settings">
        <GearIcon className={'media-button-icon'} />
      </Menu.Trigger>
      <Menu.Popup
        keepMounted
        className={cn('media-popup', 'media-menu-popup', 'sdu-menu')}
        data-on-board={onBoard ? '' : undefined}
        {...(onBoard ? { popover: undefined } : {})}
      >
        <SketchSurface inset={2} draw seedKey={'duo-settings'} />
        <Menu.Content className={'media-menu-content'}>
          <QualityMenu />
          <AudioTrackMenu />
          <PlaybackRateMenu />
          <CaptionsMenu />
        </Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  );
}

export interface SketchDuoSkinProps extends Omit<ContainerPrimitive.Props, 'children'> {
  children?: ReactNode;
  title?: string;
}

export function SketchDuoSkin({ children, className, style, title = 'Duo demo', ...props }: SketchDuoSkinProps) {
  const ref = useRef<HTMLDivElement>(null);
  const foldable = useFoldable(ref);
  const { style: segmentStyle, ...foldAttributes } = foldableAttributes(foldable);
  const layout = duoLayoutFor(foldable);
  const simulatedFullscreen = useContext(SimulatedFullscreen);
  const outerFullscreen = layout.startsWith('outer') && (simulatedFullscreen?.active ?? false);
  // Propped up in the simulation the phone is already its own little screen: no fullscreen connector there. On a real
  // Duo the split layout only appears in fullscreen, where the connector is the way out, so it stays.
  const noFullscreen = layout === 'split' && foldable.simulated;
  const chapter = useCurrentChapter();
  const controlsVisible = usePlayer(selectControls)?.controlsVisible ?? true;
  useFullscreenOrientationLock(ref, foldable.fullscreen);
  const [board, setBoard] = useState<HTMLElement | null>(null);

  return (
    <ContainerPrimitive
      className={cn('media-skin', 'media-container', 'media-video', 'sketch-duo', className)}
      data-theme="scaffold"
      data-preset="video"
      data-layout={`duo-${layout}`}
      data-outer-fullscreen={outerFullscreen ? '' : undefined}
      data-controls-shown={controlsVisible ? '' : undefined}
      {...foldAttributes}
      style={{ ...segmentStyle, ...(typeof style === 'object' ? style : {}) }}
      {...props}
    >
      {/* Closed, portrait: the empty paper above and below the picture drawn as a schematic sheet. */}
      <DuoWallpaper />

      {/* ---------- The picture: the top segment when split, the whole screen when flat, a chip when closed ---------- */}
      <div ref={ref} className={'sdu-top'}>
        <div className={'sdu-video'}>
          {children}
          {/* The poster (the stream's thumbnail) until playback starts, sized to the picture's box. */}
          <Poster />
          <VideoCaptions />
          <BufferingIndicator className={'sdu-buffering'} />
        </div>
      </div>

      {/* The fold: a dashed pencil line on the board's top edge. Nothing interactive sits on it. */}
      <div className={'sdu-crease'} aria-hidden="true">
        <span className={'sketch-label'}>FOLD</span>
      </div>

      {/* Outer display only: the trailing rail and the camera cutout at its top. */}
      <div className={'sdu-rail'} aria-hidden="true">
        <SketchLead className={'sdu-rail-edge'} dot="none" />
      </div>
      <div className={'sdu-camera'} aria-hidden="true" />

      {/* ---------- The parts ---------- */}
      <Controls.Root>
        <Controls.Content ref={setBoard} className={'sdu-board'} role="group" aria-label="Player controls">
          <SketchFrame className={'sdu-frame'} />

          <div className={'sdu-title'}>
            <SketchSurface seedKey={'duo-title'} />
            <p className={'sdu-title-main'}>U1 · {title}</p>
            <p className={'sdu-title-sub'}>{chapter ?? 'VIDEO'}</p>
          </div>

          <div className={'sdu-pads'}>
            <SketchLead className={'sdu-pads-lead'} dot="none" />
            <Part name="back" label="TP010">
              <SeekPad seconds={-10} />
            </Part>
            <Part name="play" label="TP011 · PLAY">
              <PlayButton className={cn('sketch-pad', 'sdu-play')} iconClassName={'sketch-pad-play-icon'} pad tooltip={false} />
            </Part>
            <Part name="forward" label="TP012">
              <SeekPad seconds={10} />
            </Part>
          </div>

          <div className={'sdu-timeline'}>
            <Time.Value className={cn('media-time-value', 'sdu-time')} type="current" />
            <div className={'sdu-pins'}>
              <TimeSlider pins />
            </div>
            <Time.Value className={cn('media-time-value', 'sdu-time', 'sdu-time-remaining')} type="remaining" />
          </div>

          <div className={'sdu-jacks'}>
            <Part name="mute" label="MUTE">
              <MuteButton connector />
            </Part>
            {/* Hides itself (data-hidden) when the media has no captions; the row closes up. */}
            <Part name="captions" label="CC">
              <CaptionsButton connector />
            </Part>
            <Part name="settings" label="SETTINGS">
              <DuoSettingsMenu layout={layout} boundary={board} />
            </Part>
            {noFullscreen ? null : (
              <Part name="fullscreen" label="FULL">
                <DuoFullscreenButton />
              </Part>
            )}
          </div>
        </Controls.Content>
      </Controls.Root>

      <ErrorDialog />
      <VideoHotkeys />
      <StatusAnnouncer />
      <Indicators>
        <SeekIndicator />
      </Indicators>
    </ContainerPrimitive>
  );
}
