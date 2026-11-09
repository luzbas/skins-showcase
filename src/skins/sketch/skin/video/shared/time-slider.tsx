/** @jsxImportSource react */

import { Slider as SliderPrimitive } from '@videojs/react';
import { TimeSlider as TimeSliderPrimitive } from '@videojs/react';

import { cn } from '../../lib/resolve-class-name';

import { SketchPins, SketchScribble, SketchSurface, SketchTrack } from '../sketch/drawing';
import { SketchPlayhead } from '../sketch/schematic';

/**
 * `pins` draws the track as the schematic's row of chip pins, `pinCount` of them (or one per 15px), with a red playhead
 * stem under the thumb.
 */
export function TimeSlider({
  audio = false,
  pins = false,
  pinCount,
  renderThumbnail,
}: ThumbnailSlot & { audio?: boolean; pins?: boolean; pinCount?: number } = {}) {
  return (
    <div className={'video-controls-slider-row'}>
      <TimeSliderPrimitive.Root className={'media-time-slider'} thumbAlignment="edge">
        {pins ? (
          // The schematic's pin row runs unbroken; its chapters are marked on the row above the chip.
          <TimeSliderPrimitive.Track className={'media-time-slider-track'}>
            <TimeSliderPrimitive.Buffer className={'media-time-slider-buffer'} />
            <TimeSliderPrimitive.Fill className={'media-time-slider-fill'} />
            <SketchPins buffer count={pinCount} seedKey={'time-pins'} />
          </TimeSliderPrimitive.Track>
        ) : (
          <TimeSliderPrimitive.Chapters
            className={'media-time-slider-chapters'}
            renderChapter={(props) => (
              <div className={'media-time-slider-chapter'} {...props}>
                <TimeSliderPrimitive.Track
                  className={cn('media-time-slider-track', audio && 'media-time-slider-audio-track')}
                >
                  <TimeSliderPrimitive.Buffer
                    className={cn('media-time-slider-buffer', audio && 'media-time-slider-audio-buffer')}
                  />
                  <TimeSliderPrimitive.Fill className={'media-time-slider-fill'} />
                  <SketchTrack buffer seedKey={'time'} boilOn={'.media-time-slider'} />
                </TimeSliderPrimitive.Track>
              </div>
            )}
          ></TimeSliderPrimitive.Chapters>
        )}
        <TimeSliderPrimitive.Thumb className={'media-time-slider-thumb'}>
          {pins ? <SketchPlayhead /> : <SketchSurface shape="disc" seedKey={'time-thumb'} boilOn={'.media-time-slider'} />}
          <SketchScribble seedKey={'time-thumb'} />
        </TimeSliderPrimitive.Thumb>

        <TimeSliderPrimitive.Preview className={'media-time-slider-preview'}>
          <SketchSurface seedKey={'preview'} />
          <span className={'media-sketch-tape'} aria-hidden="true" />
          <SliderPrimitive.Thumbnail.Root className={'media-slider-thumbnail'}>
            <SliderPrimitive.Thumbnail.Image render={renderThumbnail} className={'media-slider-thumbnail-image'} />
          </SliderPrimitive.Thumbnail.Root>
          <div className={cn('media-time-slider-preview-meta', audio && 'media-time-slider-audio-preview-meta')}>
            <div className={'media-time-slider-preview-label'}>
              <TimeSliderPrimitive.Value className={'media-time-slider-value'} type="pointer" />
              <TimeSliderPrimitive.ChapterTitle className={'media-time-slider-chapter-title'} />
            </div>
          </div>
        </TimeSliderPrimitive.Preview>
      </TimeSliderPrimitive.Root>
    </div>
  );
}

export interface ThumbnailSlot {
  /** Draws the storyboard frame in the slider preview in place of the one the skin renders. */
  renderThumbnail?: SliderPrimitive.Thumbnail.ImageProps['render'];
}
