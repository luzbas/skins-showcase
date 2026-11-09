/** @jsxImportSource react */

import { MuteButton as MuteButtonPrimitive } from '@videojs/react';
import {
  VolumeOffIcon as VolumeOffIconPrimitive,
  VolumeHighIcon as VolumeHighIconPrimitive,
} from '../icons';

import { cn, resolveClassName } from '../../lib/resolve-class-name';

import { Button } from './button';

export function MuteButton({ className, connector = false, disc = false, ...props }: MuteButtonPrimitive.Props & { connector?: boolean; disc?: boolean } = {}) {
  return (
    <MuteButtonPrimitive
      render={<Button connector={connector} disc={disc} />}
      className={(state) => cn('media-mute-button', resolveClassName(className, state))}
      {...props}
    >
      <VolumeOffIconPrimitive className={cn('media-button-icon', 'media-mute-button-off-icon')} />
      <VolumeHighIconPrimitive className={cn('media-button-icon', 'media-mute-button-high-icon')} />
    </MuteButtonPrimitive>
  );
}
