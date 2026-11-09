/** @jsxImportSource react */

import { VolumePopover as VolumePopoverPrimitive, VolumeSlider } from '@videojs/react';

import { cn } from '../../lib/resolve-class-name';

import { SketchScribble, SketchSurface, SketchTrack } from '../sketch/drawing';

import { MuteButton } from './mute-button';
import { ButtonTooltip } from './tooltip';

export function VolumePopover() {
  return (
    <VolumePopoverPrimitive.Root openOnHover delay={200} closeDelay={100} side="top">
      <ButtonTooltip delay={0} disabled sticky>
        <VolumePopoverPrimitive.Trigger render={<MuteButton />} />
      </ButtonTooltip>
      <VolumePopoverPrimitive.Popup
        className={cn('media-popup', 'media-popup-safe-area', 'media-volume-popover-popup')}
      >
        <SketchSurface draw />
        <VolumeSlider.Root className={'media-volume-slider'} orientation="vertical" thumbAlignment="edge">
          <VolumeSlider.Track className={'media-volume-slider-track'}>
            <VolumeSlider.Fill className={'media-volume-slider-fill'} />
          </VolumeSlider.Track>
          <SketchTrack orientation="vertical" seedKey={'volume'} boilOn={'.media-volume-slider'} />
          <VolumeSlider.Thumb className={'media-volume-slider-thumb'}>
            <SketchSurface shape="disc" seedKey={'volume-thumb'} boilOn={'.media-volume-slider'} />
            <SketchScribble seedKey={'volume-thumb'} />
          </VolumeSlider.Thumb>
        </VolumeSlider.Root>
      </VolumePopoverPrimitive.Popup>
    </VolumePopoverPrimitive.Root>
  );
}
