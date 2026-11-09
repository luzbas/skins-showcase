/** @jsxImportSource react */

import { CaptionsButton as CaptionsButtonPrimitive } from '@videojs/react';
import {
  CaptionsOffIcon as CaptionsOffIconPrimitive,
  CaptionsOnIcon as CaptionsOnIconPrimitive,
} from '../icons';

import { cn, resolveClassName } from '../../lib/resolve-class-name';

import { Button } from './button';
import { ButtonTooltip } from './tooltip';

export function CaptionsToggle() {
  return (
    <ButtonTooltip>
      <CaptionsButton connector />
    </ButtonTooltip>
  );
}

export type CaptionsButtonProps = Omit<CaptionsButtonPrimitive.Props, 'children'> & { connector?: boolean };

export function CaptionsButton({ className, connector = false, ...props }: CaptionsButtonProps = {}) {
  return (
    <CaptionsButtonPrimitive
      render={<Button connector={connector} />}
      className={(state) => cn('media-captions-button', resolveClassName(className, state))}
      {...props}
    >
      <CaptionsOffIconPrimitive className={cn('media-button-icon', 'media-captions-button-off-icon')} />
      <CaptionsOnIconPrimitive className={cn('media-button-icon', 'media-captions-button-on-icon')} />
    </CaptionsButtonPrimitive>
  );
}
