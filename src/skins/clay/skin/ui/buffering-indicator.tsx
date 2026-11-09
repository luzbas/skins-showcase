/** @jsxImportSource react */

'use client';

import '../styles/base.css';
import '../styles/audio/theme.css';
import '../styles/video/captions.css';
import '../styles/video/theme.css';
import '../styles/indicators.css';
import { BufferingIndicator as BufferingIndicatorPrimitive } from '@videojs/react';
import { SpinnerIcon as SpinnerIconPrimitive } from './clay-icons';

import { cn, resolveClassName } from '../lib/resolve-class-name';

export type BufferingIndicatorProps = Omit<BufferingIndicatorPrimitive.Props, 'children'>;

export function BufferingIndicator({ className, ...props }: BufferingIndicatorProps = {}) {
  return (
    <BufferingIndicatorPrimitive
      className={(state) => cn('media-buffering-indicator', resolveClassName(className, state))}
      {...props}
    >
      <SpinnerIconPrimitive className={'media-buffering-indicator-spinner-icon'} />
      {/* Clay: a ring of four clay pieces turns in place of the spinner; see clay.css. */}
      <span className={'clay-spinner'} aria-hidden="true" />
    </BufferingIndicatorPrimitive>
  );
}
