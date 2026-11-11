/** @jsxImportSource react */

'use client';

import { Time } from '@videojs/react';
import type { ComponentProps } from 'react';

import { TimeSlider } from '../../ui/time-slider';
import { cn } from '../../lib/resolve-class-name';

export type RenderThumbnail = NonNullable<ComponentProps<typeof TimeSlider>>['renderThumbnail'];

/**
 * The Video.js time slider, drawn as a highlighter stroke over a pencil line. Each chapter is its own stretch of the
 * line, so chapter boundaries show as small ticks. The time reads "4:12 of 9:19" underneath.
 */
export function Timeline({ renderThumbnail, className }: { renderThumbnail?: RenderThumbnail; className?: string }) {
  return (
    <div className={cn('ap-timeline', className)}>
      <TimeSlider className={'ap-time-slider'} renderThumbnail={renderThumbnail} />
      <p className={'ap-time'}>
        <Time.Value type="current" className={'ap-num'} /> <span className={'ap-of'}>of</span>{' '}
        <Time.Value type="duration" className={'ap-num'} />
      </p>
    </div>
  );
}
