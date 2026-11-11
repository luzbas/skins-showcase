/** @jsxImportSource react */

import type { ComponentProps } from 'react';

import { SeekIndicator } from '../../ui/seek-indicator';
import { StatusAnnouncer } from '../../ui/status-announcer';
import { StatusIndicator } from '../../ui/status-indicator';
import { VolumeIndicator } from '../../ui/volume-indicator';
import { cn } from '../../lib/resolve-class-name';

/** The Default skin's centre play/pause flash is dropped: the big play orb shows the paused state, and the status
 * announcer still reports it to screen readers. */
export type VideoStatusIndicatorsProps = Omit<ComponentProps<'div'>, 'children'>;

export function VideoStatusIndicators({ className, ...props }: VideoStatusIndicatorsProps = {}) {
  return (
    <>
      <StatusAnnouncer />
      <div className={cn('video-status-indicators', className)} {...props}>
        <VolumeIndicator />
        <StatusIndicator />
        <SeekIndicator />
      </div>
    </>
  );
}
