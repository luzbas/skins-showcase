/** @jsxImportSource react */

import { Controls, Time, Tooltip } from '@videojs/react';
import type { ComponentProps } from 'react';

import { ButtonTooltip } from '../../ui/button-tooltip';
import { CaptionsButton } from '../../ui/captions-button';
import { FullscreenButton } from '../../ui/fullscreen-button';
import { PlayButton } from '../../ui/play-button';
import { SeekButton } from '../../ui/seek-button';
import { TimeSlider } from '../../ui/time-slider';
import { VolumePopover } from '../../ui/volume-popover';
import { cn } from '../../lib/resolve-class-name';

import { VideoSettingsMenu } from '../menus/settings-menu';

export interface PicnicControlsProps {
  renderThumbnail?: NonNullable<ComponentProps<typeof TimeSlider>>['renderThumbnail'];
}

/**
 * Two sets of real Video.js controls, both laid over the 3D scene by `PicnicStage` from the projection of their meshes:
 *
 * - The bulb strand (`picnic-tag--<Name>`): each control sits on the paper tag hanging under its bulb, left to right in the
 *   same order as the strand. The timeline sits on the fairy lights along the sheet's hem.
 * - The projector remote (`picnic-key--<Name>`): a toggle on the remote, and the remote's keys, which are only shown while
 *   the remote is lifted (`data-picnic-remote="open"`), including in fullscreen where the remote carries the controls.
 */
export function PicnicControls({ renderThumbnail }: PicnicControlsProps = {}) {
  return (
    <Controls.Root>
      <Controls.Content className={cn('video-controls', 'video-controls-content')}>
        <Tooltip.Provider>
          <div className={'picnic-strand'} role="group" aria-label="Player controls">
            <ButtonTooltip side="bottom">
              <CaptionsButton className={'picnic-tag picnic-tag--Captions'} />
            </ButtonTooltip>
            <VolumePopover className={'picnic-tag picnic-tag--Volume'} side="bottom" />
            <Time.Value type="current" className={'picnic-tag-time picnic-tag--Time'} />
            <ButtonTooltip side="bottom">
              <SeekButton className={'picnic-tag picnic-tag--Rewind'} seconds={-10} />
            </ButtonTooltip>
            <ButtonTooltip side="bottom">
              <PlayButton className={'picnic-tag picnic-tag--Play'} />
            </ButtonTooltip>
            <ButtonTooltip side="bottom">
              <SeekButton className={'picnic-tag picnic-tag--Forward'} seconds={10} />
            </ButtonTooltip>
            <Time.Value type="duration" className={'picnic-tag-time picnic-tag--Duration'} />
            <VideoSettingsMenu className={'picnic-tag picnic-tag--Settings'} />
            <ButtonTooltip side="bottom">
              <FullscreenButton className={'picnic-tag picnic-tag--Fullscreen'} />
            </ButtonTooltip>
            <TimeSlider className={'picnic-hem'} renderThumbnail={renderThumbnail} />
          </div>

          {/* Shown once the view has been dragged or zoomed (PicnicStage sets data-picnic-moved). */}
          <button type="button" className={'picnic-reset-view'} aria-label="Reset view">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.7h3.7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Reset view</span>
          </button>
          <p className={'picnic-zoom-hint'} aria-hidden="true" />

          <div className={'picnic-remote'}>
            <button
              type="button"
              className={'picnic-remote-toggle'}
              aria-expanded="false"
              aria-controls="picnic-remote-keys"
              aria-label="Show the remote control"
            />
            <div id="picnic-remote-keys" className={'picnic-remote-keys'} role="group" aria-label="Remote control">
              <Time.Value type="current" className={'picnic-remote-time picnic-key--TimeLabel'} />
              <TimeSlider className={'picnic-remote-slider'} renderThumbnail={renderThumbnail} />
              <Time.Value type="duration" className={'picnic-remote-time picnic-key--DurationLabel'} />
              <ButtonTooltip side="top">
                <CaptionsButton className={'picnic-key picnic-key--CC'} />
              </ButtonTooltip>
              <VolumePopover className={'picnic-key picnic-key--Volume'} side="top" />
              <ButtonTooltip side="top">
                <SeekButton className={'picnic-key picnic-key--Rewind'} seconds={-10} />
              </ButtonTooltip>
              <ButtonTooltip side="top">
                <PlayButton className={'picnic-key picnic-key--Play'} />
              </ButtonTooltip>
              <ButtonTooltip side="top">
                <SeekButton className={'picnic-key picnic-key--Forward'} seconds={10} />
              </ButtonTooltip>
              <VideoSettingsMenu className={'picnic-key picnic-key--Settings'} />
              <ButtonTooltip side="top">
                <FullscreenButton className={'picnic-key picnic-key--Fullscreen'} />
              </ButtonTooltip>
            </div>
          </div>
        </Tooltip.Provider>
      </Controls.Content>
    </Controls.Root>
  );
}
