/** @jsxImportSource react */

'use client';

import '../styles/video/base.css';
import './skin.css';
import '../styles/ascii.css';
import type { ComponentProps, ReactNode } from 'react';

import { AsciiFonts } from '../ui/ascii-fonts';
import { BufferingIndicator } from '../ui/buffering-indicator';
import { Container } from '../ui/container';
import { ErrorDialog } from '../ui/error-dialog';
import { Poster } from '../ui/poster';
import { Title } from '../ui/title';
import { cn } from '../lib/resolve-class-name';

import { VideoGestures } from './behaviors/gestures';
import { VideoHotkeys } from './behaviors/hotkeys';
import { AsciiCaptions } from './display/ascii-captions';
import { AsciiScreen } from './display/ascii-screen';
import { AsciiStage } from './display/ascii-stage';
import { VideoStatusIndicators } from './display/status-indicators';
import { DefaultVideoControls } from './layout/controls';

export interface VideoSkinProps extends Omit<NonNullable<ComponentProps<typeof Container>>, 'children'> {
  children?: ReactNode;
  renderPoster?: NonNullable<ComponentProps<typeof Poster>>['renderImage'];
  renderThumbnail?: NonNullable<ComponentProps<typeof DefaultVideoControls>>['renderThumbnail'];
}

export function VideoSkin({ children, className, renderPoster, renderThumbnail, ...props }: VideoSkinProps = {}) {
  return (
    <Container className={cn('video-skin', 'ascii-skin', className)} data-theme="default" data-preset="video" {...props}>
      <AsciiFonts />
      {children}
      <AsciiScreen />
      <Poster renderImage={renderPoster} />
      <AsciiCaptions />
      <AsciiStage />
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
