/** @jsxImportSource react */

import {
  CastButton as CastButtonPrimitive,
  Controls,
  FullscreenButton as FullscreenButtonPrimitive,
  PiPButton as PiPButtonPrimitive,
  SeekButton as SeekButtonPrimitive,
  Time,
  Tooltip,
  usePlayer,
  VolumeSlider,
} from '@videojs/react';
import { selectAudioTrack, selectQuality, selectTextTrack, selectTime } from '@videojs/core/dom';
import type { ReactNode } from 'react';

import { cn } from '../lib/resolve-class-name';

import {
  CastEnterIcon,
  CastExitIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PipEnterIcon,
  PipExitIcon,
} from './icons';
import { SketchFrame, SketchLead, SketchPins, SketchScribble } from './sketch/drawing';
import type { SketchLayout } from './sketch/layout';
import {
  ChapterList,
  ChapterRow,
  SchematicArt,
  TimeTicks,
  VideoCaptions,
  VideoTimecode,
  VolumeReading,
  formatClock,
  useProgressStyle,
} from './sketch/schematic';
import { AirPlayButton } from './shared/airplay-button';
import { Button } from './shared/button';
import { CaptionsButton } from './shared/captions-button';
import { MuteButton } from './shared/mute-button';
import { PlayButton } from './shared/play-button';
import { AudioChip, CaptionsChip, QualityChip, SpeedChip } from './shared/settings-menu';
import { TimeSlider, type ThumbnailSlot } from './shared/time-slider';
import { Title } from './shared/title';
import { VideoBufferingIndicator } from './shared/video-feedback';

/** Volume as a ladder of ten pads, filled in red pencil up to the level. */
function VolumeLadder() {
  return (
    <VolumeSlider.Root className={cn('media-volume-slider', 'sketch-ladder')} orientation="horizontal" thumbAlignment="edge">
      <VolumeSlider.Track className={'media-volume-slider-track'}>
        <VolumeSlider.Fill className={'media-volume-slider-fill'} />
      </VolumeSlider.Track>
      <SketchPins count={10} seedKey={'volume-ladder'} />
      <VolumeSlider.Thumb className={'media-volume-slider-thumb'}>
        <SketchScribble seedKey={'volume-thumb'} />
      </VolumeSlider.Thumb>
    </VolumeSlider.Root>
  );
}

/** A test pad with its silkscreen reference printed beside it. */
function PadSlot({ name, label, children }: { name: string; label: ReactNode; children: ReactNode }) {
  return (
    <div className={cn('sketch-pad-slot', `sketch-pad-slot-${name}`)}>
      <SketchLead className={'sketch-pad-lead'} dot="start" />
      {children}
      <span className={'sketch-label'} aria-hidden="true">
        {label}
      </span>
    </div>
  );
}

function SeekPad({ seconds }: { seconds: number }) {
  return (
    <SeekButtonPrimitive render={<Button pad />} className={cn('sketch-pad', 'sketch-pad-seek')} seconds={seconds}>
      <span className={'sketch-pad-text'} aria-hidden="true">
        {seconds < 0 ? '−' : '+'}
        {Math.abs(seconds)}s
      </span>
    </SeekButtonPrimitive>
  );
}

/** A board connector, its J number counted by CSS so hidden connectors leave no gap in the count. */
function Jack({ name, label, children }: { name: string; label: ReactNode; children: ReactNode }) {
  return (
    <div className={'sketch-jack'} data-jack={name}>
      {children}
      <span className={'sketch-label'} aria-hidden="true">
        {label}
      </span>
      <SketchLead className={'sketch-jack-stem'} dot="none" />
    </div>
  );
}

function Key({ children }: { children: ReactNode }) {
  return <span className={'sketch-key'}> ({children})</span>;
}

function Connectors() {
  return (
    <div className={'sketch-connectors'}>
      <SketchLead className={'sketch-lead-bus'} dot="none" />
      <Jack name="captions" label="CC">
        <CaptionsButton connector />
      </Jack>
      <Jack name="mute" label="MUTE">
        <MuteButton connector />
      </Jack>
      <Jack name="pip" label="PIP">
        <PiPButtonPrimitive render={<Button connector />} className={'media-pip-button'}>
          <PipEnterIcon className={cn('media-button-icon', 'media-pip-button-enter-icon')} />
          <PipExitIcon className={cn('media-button-icon', 'media-pip-button-exit-icon')} />
        </PiPButtonPrimitive>
      </Jack>
      <Jack name="airplay" label="AIRPLAY">
        <AirPlayButton />
      </Jack>
      <Jack name="cast" label="CAST">
        <CastButtonPrimitive render={<Button connector />} className={'media-cast-button'}>
          <CastEnterIcon className={cn('media-button-icon', 'media-cast-button-enter-icon')} />
          <CastExitIcon className={cn('media-button-icon', 'media-cast-button-exit-icon')} />
        </CastButtonPrimitive>
      </Jack>
      <Jack
        name="fullscreen"
        label={
          <>
            <span className={'sketch-label-enter'}>FULL</span>
            <span className={'sketch-label-exit'}>EXIT</span>
          </>
        }
      >
        <FullscreenButtonPrimitive render={<Button connector />} className={'media-fullscreen-button'}>
          <FullscreenEnterIcon className={cn('media-button-icon', 'media-fullscreen-button-enter-icon')} />
          <FullscreenExitIcon className={cn('media-button-icon', 'media-fullscreen-button-exit-icon')} />
        </FullscreenButtonPrimitive>
      </Jack>
    </div>
  );
}

function Settings({ layout }: { layout: SketchLayout }) {
  const qualities = usePlayer(selectQuality)?.videoRenditionList.length ?? 0;
  const audioTracks = usePlayer(selectAudioTrack)?.audioTrackList.length ?? 0;
  const captionTracks =
    usePlayer(selectTextTrack)?.textTrackList.filter((t) => t.kind === 'captions' || t.kind === 'subtitles').length ?? 0;
  // Menus open beside the chips over the video; in the stacked board, above the row of chips.
  const placement = layout === 'stack' ? ({ side: 'top', align: 'start' } as const) : ({ side: 'left', align: 'center' } as const);

  return (
    <div className={'sketch-settings'}>
      <span className={'sketch-label'} aria-hidden="true">
        SETTINGS
      </span>
      <SpeedChip {...placement} />
      {qualities > 1 && <QualityChip {...placement} />}
      {audioTracks > 1 && <AudioChip {...placement} />}
      {captionTracks > 0 && <CaptionsChip />}
      {layout === 'overlay' && <ChapterList />}
    </div>
  );
}

function TimeTag() {
  const style = useProgressStyle();
  return (
    <div className={'sketch-time'} style={style}>
      <span className={'sketch-time-ref'} aria-hidden="true">
        TP{' '}
      </span>
      <Time.Group className={'media-time-group'}>
        <Time.Value className={'media-time-toggle'} type="current" toggle />
        <Time.Value className={'media-time-current-value'} type="current" />
        <Time.Separator className={'media-time-separator'} />
        <Time.Value className={'media-time-duration-value'} type="duration" />
      </Time.Group>
    </div>
  );
}

function Subtitle() {
  const chapters = usePlayer(selectTextTrack)?.chaptersCues.length ?? 0;
  const duration = usePlayer(selectTime)?.duration ?? 0;
  if (!(duration > 0)) return null;
  return (
    <p className={'sketch-subtitle'} aria-hidden="true">
      {chapters ? `${chapters} CHAPTERS · ` : 'VIDEO · '}
      {formatClock(duration)}
    </p>
  );
}

/**
 * The Schematic: the video is a chip and the controls are parts wired to it. Every part is placed
 * by board.css for the current layout; in the board and stacked layouts the controls always show,
 * in fullscreen they lie over the video and hide when the viewer is idle. Source order follows the
 * board: title and chapters, the pads on the left, connectors and settings on the right, then the
 * pin row, time and volume along the bottom.
 */
export function BoardControls({ layout, renderThumbnail }: ThumbnailSlot & { layout: SketchLayout }) {
  return (
    <Controls.Root visibility={layout === 'overlay' ? 'auto' : 'always'}>
      <Controls.Backdrop className={cn('video-controls-backdrop', 'sketch-wash')} />
      <VideoBufferingIndicator />
      <Controls.Content className={cn('video-controls-content', 'sketch-board')}>
        <Tooltip.Provider>
          {layout === 'board' && <SchematicArt />}
          <SketchFrame className={'sketch-chip'} />
          <VideoTimecode />
          <VideoCaptions />

          <div className={'sketch-title'}>
            <Title />
            <Subtitle />
          </div>
          {layout === 'overlay' && <ChapterRow />}

          <SketchLead className={cn('sketch-lead', 'sketch-lead-left')} dot="start" />
          <SketchLead className={cn('sketch-lead', 'sketch-lead-right')} dot="start" />
          <SketchLead className={cn('sketch-lead', 'sketch-lead-pads')} dot="none" />
          <PadSlot name="back" label="TP010">
            <SeekPad seconds={-10} />
          </PadSlot>
          <PadSlot
            name="play"
            label={
              <>
                TP011 · <span className={'sketch-label-play'}>PLAY</span>
                <span className={'sketch-label-pause'}>PAUSE</span>
                <Key>K</Key>
              </>
            }
          >
            <PlayButton className={cn('sketch-pad', 'sketch-pad-play')} iconClassName={'sketch-pad-play-icon'} pad tooltip={false} />
          </PadSlot>
          <PadSlot name="forward" label="TP012">
            <SeekPad seconds={10} />
          </PadSlot>

          <Connectors />
          <Settings layout={layout} />

          <div className={'sketch-timeline'}>
            <TimeSlider pins pinCount={layout === 'board' ? 40 : undefined} renderThumbnail={renderThumbnail} />
            <TimeTicks />
          </div>
          <TimeTag />
          <ChapterList />

          <div className={'sketch-volume'}>
            <span className={cn('sketch-label', 'sketch-volume-label')} aria-hidden="true">
              R1 · VOLUME <VolumeReading />
            </span>
            <MuteButton disc className={'sketch-mute'} />
            <span className={cn('sketch-label', 'sketch-mute-label')} aria-hidden="true">
              SW1 · MUTE<Key>M</Key>
            </span>
            <VolumeLadder />
          </div>

        </Tooltip.Provider>
      </Controls.Content>
    </Controls.Root>
  );
}
