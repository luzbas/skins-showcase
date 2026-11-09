/** @jsxImportSource react */

import { Poster as PosterPrimitive } from '@videojs/react';
import { BufferingIndicator as BufferingIndicatorPrimitive, Controls } from '@videojs/react';
import { SpinnerIcon as SpinnerIconPrimitive } from '../icons';
import type { ClassValue } from 'cn';

import { cn, resolveClassName } from '../../lib/resolve-class-name';

import { SketchSurface } from '../sketch/drawing';

export function Poster({ renderImage }: { renderImage?: PosterPrimitive.ImageProps['render'] } = {}) {
  return (
    <PosterPrimitive.Root className={'media-poster'}>
      <PosterPrimitive.Image render={renderImage} className={'media-poster-image'} />
    </PosterPrimitive.Root>
  );
}

export function BufferingIndicator({ className }: { className?: ClassValue } = {}) {
  return (
    <BufferingIndicatorPrimitive
      className={(state) => cn('media-buffering-indicator', resolveClassName(className, state))}
    >
      <span className={'media-sketch-spinner-disc'}>
        <SketchSurface shape="disc" seedKey={'spinner'} />
        <SpinnerIconPrimitive className={'media-buffering-indicator-spinner-icon'} />
      </span>
    </BufferingIndicatorPrimitive>
  );
}

export function VideoBufferingIndicator() {
  return (
    <Controls.Group className={'media-buffering-indicator-controls'}>
      <BufferingIndicator className={'media-buffering-indicator-backdrop'} />
    </Controls.Group>
  );
}
