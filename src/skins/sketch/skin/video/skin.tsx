/** @jsxImportSource react */

'use client';

import './fonts/plex-mono.css';
import '../styles/video/scaffold.css';
import './skin.css';
import './sketch.css';
import './board.css';
import { Container as ContainerPrimitive, Poster as PosterPrimitive, Slider as SliderPrimitive } from '@videojs/react';
import { useState, type ReactNode } from 'react';

import { cn } from '../lib/resolve-class-name';

import { VideoGestures } from './behaviors/gestures';
import { VideoHotkeys } from './behaviors/hotkeys';
import { BoardControls } from './board';
import { ErrorDialog } from './shared/error-dialog';
import { Indicators } from './shared/indicators';
import { SeekIndicator } from './shared/seek-indicator';
import { StatusAnnouncer } from './shared/status-announcer';
import { Poster } from './shared/video-feedback';
import { SketchHairline } from './sketch/hairline';
import { useFrameTone, useFullscreenOrientationLock, useSketchLayout } from './sketch/layout';

export interface VideoSkinProps extends Omit<ContainerPrimitive.Props, 'children'> {
  children?: ReactNode;
  renderPoster?: PosterPrimitive.ImageProps['render'];
  renderThumbnail?: SliderPrimitive.Thumbnail.ImageProps['render'];
}

export function VideoSkin({ children, className, renderPoster, renderThumbnail, style, ...props }: VideoSkinProps = {}) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const { layout, stackHeight } = useSketchLayout(root);
  useFrameTone(root, layout === 'overlay');
  useFullscreenOrientationLock(root, layout === 'overlay');

  return (
    <ContainerPrimitive
      ref={setRoot}
      className={cn('media-skin', 'media-container', 'media-video', className)}
      data-theme="scaffold"
      data-preset="video"
      data-layout={layout}
      style={layout === 'stack' ? { ...style, height: stackHeight } : style}
      {...props}
    >
      {children}
      <Poster renderImage={renderPoster} />
      <ErrorDialog />
      <BoardControls layout={layout} renderThumbnail={renderThumbnail} />
      {layout === 'overlay' && <SketchHairline />}

      <VideoHotkeys />
      <VideoGestures />
      <StatusAnnouncer />
      <Indicators>
        <SeekIndicator />
      </Indicators>
    </ContainerPrimitive>
  );
}
