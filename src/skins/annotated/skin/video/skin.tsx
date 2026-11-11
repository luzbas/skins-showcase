/** @jsxImportSource react */

'use client';

import '../styles/video/base.css';
import './skin.css';
import '../styles/annotated.css';
import { Tooltip } from '@videojs/react';
import type { ComponentProps } from 'react';

import { Container } from '../ui/container';
import { cn } from '../lib/resolve-class-name';

import { VideoHotkeys } from './behaviors/hotkeys';
import { AnnotatedStage, type AnnotatedStageProps } from './annotated/stage';

export type { ChapterCue } from './annotated/chapters';

export interface VideoSkinProps
  extends Omit<NonNullable<ComponentProps<typeof Container>>, 'children'>,
    AnnotatedStageProps {}

/**
 * Spectral for the printed page and Kalam for the handwritten notes (both SIL Open Font License), from Google Fonts.
 * React hoists the stylesheet link into the head and loads it once; without them the stacks fall back to system fonts.
 */
const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400&family=Kalam:wght@400;700&display=swap';

/**
 * Annotated Page: a video player laid out as an open book. The left page holds the film as a figure, with its caption
 * and a highlighter timeline; the right page is the controls, written as a sentence ("The film is paused at 4:12, in
 * the chapter called Encounter…") whose highlighted words are buttons. The extra controls are footnotes. In
 * fullscreen the film fills the screen and the right page turns in over it when paused.
 */
export function VideoSkin({ children, className, renderPoster, renderThumbnail, kicker, marginNote, ...props }: VideoSkinProps = {}) {
  return (
    <Container className={cn('video-skin', 'annotated-skin', className)} data-theme="default" data-preset="video" {...props}>
      <link rel="stylesheet" href={FONT_URL} precedence="default" />
      <Tooltip.Provider>
        <AnnotatedStage renderPoster={renderPoster} renderThumbnail={renderThumbnail} kicker={kicker} marginNote={marginNote}>
          {children}
        </AnnotatedStage>
      </Tooltip.Provider>
      <VideoHotkeys />
    </Container>
  );
}
