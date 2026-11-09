// The Sketch skin as a site would embed it: a pencil schematic where the video is a chip and the controls are
// parts wired to it.
import type { Ref } from 'react';
import { VideoPlayer } from '@videojs/react/video';
import { HlsVideo } from '@videojs/react/media/hls-video';
import { VideoSkin } from '../skins/sketch/skin/video/skin';
import { DEMO_CHAPTERS, DEMO_HLS, DEMO_POSTER } from '../media';

interface Props {
  mediaRef?: Ref<HTMLDivElement>;
  title?: string;
  className?: string;
}

export function SketchPlayer({ mediaRef, title = 'Cosmic Dawn', className }: Props) {
  // The board is drawn against the browser's default line height: a page's own line-height (the notebook site
  // uses 1.6) would shift the pencil rings off the play and seek pads, so reset it here.
  return (
    <div ref={mediaRef} className={className} style={{ lineHeight: 'normal' }}>
      <VideoPlayer poster={DEMO_POSTER} title={title}>
        <VideoSkin style={{ width: '100%', aspectRatio: '16 / 9' }}>
          <HlsVideo src={DEMO_HLS} playsInline crossOrigin="anonymous">
            <track kind="chapters" label="English" srcLang="en" src={DEMO_CHAPTERS} default />
          </HlsVideo>
        </VideoSkin>
      </VideoPlayer>
    </div>
  );
}
