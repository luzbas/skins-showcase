/** @jsxImportSource react */

'use client';

import '../styles/video/base.css';
import './skin.css';
import '../styles/picnic.css';
import type { ComponentProps, ReactNode } from 'react';

import { BufferingIndicator } from '../ui/buffering-indicator';
import { Container } from '../ui/container';
import { ErrorDialog } from '../ui/error-dialog';
import { Poster } from '../ui/poster';
import { cn } from '../lib/resolve-class-name';

import { VideoGestures } from './behaviors/gestures';
import { VideoHotkeys } from './behaviors/hotkeys';
import { PicnicCaptions } from './display/picnic-captions';
import { PicnicStage, type PicnicStageProps } from './display/picnic-stage';
import { VideoStatusIndicators } from './display/status-indicators';
import { PicnicControls } from './layout/controls';

export interface VideoSkinProps extends Omit<NonNullable<ComponentProps<typeof Container>>, 'children'> {
  children?: ReactNode;
  /** URL of the picnic scene exported from Blender. Defaults to the one bundled with the skin. */
  modelUrl?: PicnicStageProps['modelUrl'];
  renderPoster?: NonNullable<ComponentProps<typeof Poster>>['renderImage'];
  renderThumbnail?: NonNullable<ComponentProps<typeof PicnicControls>>['renderThumbnail'];
}

/**
 * Picnic cinema: an outdoor movie night modelled in Blender and rendered with three.js. The video plays on a sheet hung
 * between two posts. The controls hang as paper tags from a string of festoon bulbs that light up when the video is
 * paused and dim while it plays; the timeline is the fairy lights along the sheet's hem; a corded projector remote on
 * the blanket lifts into a full control panel; fireflies drift out when the video stays paused; and fullscreen pushes the
 * camera into the sheet. Every control is a real Video.js control laid over its mesh, so keyboard, screen readers,
 * tooltips and menus work as usual.
 */
export function VideoSkin({ children, className, modelUrl, renderPoster, renderThumbnail, ...props }: VideoSkinProps = {}) {
  return (
    <Container className={cn('video-skin', 'picnic-skin', className)} data-theme="default" data-preset="video" {...props}>
      {children}
      <PicnicStage modelUrl={modelUrl} />
      <Poster renderImage={renderPoster} className={'picnic-poster'} />
      <PicnicCaptions />
      <BufferingIndicator />
      <ErrorDialog />

      <PicnicControls renderThumbnail={renderThumbnail} />

      <VideoHotkeys />
      <VideoGestures />
      <VideoStatusIndicators />
    </Container>
  );
}
