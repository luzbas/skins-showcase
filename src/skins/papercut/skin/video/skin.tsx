/** @jsxImportSource react */

'use client';

import '../styles/video/base.css';
import './skin.css';
import '../styles/papercut.css';
import type { ComponentProps, ReactNode } from 'react';

import { BufferingIndicator } from '../ui/buffering-indicator';
import { Container } from '../ui/container';
import { ErrorDialog } from '../ui/error-dialog';
import { PapercutFilters } from '../ui/papercut-filters';
import { Poster } from '../ui/poster';
import { Title } from '../ui/title';
import { cn } from '../lib/resolve-class-name';

import { VideoGestures } from './behaviors/gestures';
import { VideoHotkeys } from './behaviors/hotkeys';
import { PaperStage } from './display/paper-stage';
import { VideoStatusIndicators } from './display/status-indicators';
import { DefaultVideoControls } from './layout/controls';

export interface VideoSkinProps extends Omit<NonNullable<ComponentProps<typeof Container>>, 'children'> {
  children?: ReactNode;
  renderPoster?: NonNullable<ComponentProps<typeof Poster>>['renderImage'];
  renderThumbnail?: NonNullable<ComponentProps<typeof DefaultVideoControls>>['renderThumbnail'];
}

export function VideoSkin({ children, className, renderPoster, renderThumbnail, ...props }: VideoSkinProps = {}) {
  return (
    <Container className={cn('video-skin', 'papercut-skin', className)} data-theme="default" data-preset="video" {...props}>
      <PapercutFilters />
      {children}
      <Poster renderImage={renderPoster} />
      <PaperStage />
      <BufferingIndicator />
      <ErrorDialog />
      <Title />

      <DefaultVideoControls renderThumbnail={renderThumbnail} />

      <VideoHotkeys />
      <VideoGestures />
      <VideoStatusIndicators />
    </Container>
  );
}
