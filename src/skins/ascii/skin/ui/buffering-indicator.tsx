/** @jsxImportSource react */

'use client';

import '../styles/base.css';
import '../styles/audio/theme.css';
import '../styles/video/captions.css';
import '../styles/video/theme.css';
import '../styles/indicators.css';
import { BufferingIndicator as BufferingIndicatorPrimitive } from '@videojs/react';
import { SpinnerIcon as SpinnerIconPrimitive } from '@videojs/react/icons';

import { cn, resolveClassName } from '../lib/resolve-class-name';

export type BufferingIndicatorProps = Omit<BufferingIndicatorPrimitive.Props, 'children'>;

export function BufferingIndicator({ className, ...props }: BufferingIndicatorProps = {}) {
  return (
    <BufferingIndicatorPrimitive
      className={(state) => cn('media-buffering-indicator', resolveClassName(className, state))}
      {...props}
    >
      <SpinnerIconPrimitive className={'media-buffering-indicator-spinner-icon'} />
      {/* ASCII: a | / - \ spinner and a loading line replace the spinner icon; see ascii.css. */}
      <span className={'ax-loading'} aria-hidden="true">
        <span className={'ax-spinner'}>
          <span className={'ax-spinner-strip'}>|/-\</span>
        </span>
        <span>BUFFERING</span>
        <span className={'ax-cursor'}>_</span>
      </span>
    </BufferingIndicatorPrimitive>
  );
}
