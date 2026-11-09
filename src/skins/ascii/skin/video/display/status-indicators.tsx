/** @jsxImportSource react */

import type { ComponentProps } from 'react';

import { SeekIndicator } from '../../ui/seek-indicator';
import { StatusAnnouncer } from '../../ui/status-announcer';
import { PlaybackStatusIndicator, StatusIndicator } from '../../ui/status-indicator';
import { VolumeIndicator } from '../../ui/volume-indicator';
import { cn } from '../../lib/resolve-class-name';

export type VideoStatusIndicatorsProps = Omit<ComponentProps<'div'>, 'children'>;

export function VideoStatusIndicators({ className, ...props }: VideoStatusIndicatorsProps = {}) {
  return (
    <>
      <StatusAnnouncer />
      <div className={cn('video-status-indicators', className)} {...props}>
        <VolumeIndicator />
        <StatusIndicator />
        <SeekIndicator />
        <PlaybackStatusIndicator />
      </div>
    </>
  );
}
