// The Annotated Page skin as a site would embed it: a player laid out as an open book, the film as a figure on the
// left page, the controls written as a sentence on the right, the extras as footnotes.
import type { Ref } from 'react';
import { VideoPlayer } from '@videojs/react/video';
import { HlsVideo } from '@videojs/react/media/hls-video';
import { VideoSkin } from '../skins/annotated/skin/video/skin';
import { DEMO_CHAPTERS, DEMO_HLS, DEMO_POSTER } from '../media';

const STORYBOARD = 'https://image.mux.com/83EzHOvVzVN01AsrD01BCpiH02Pj3S8mfzBOu101w2nHC5s/storyboard.vtt';

interface Props {
  mediaRef?: Ref<HTMLDivElement>;
  title?: string;
  className?: string;
}

export function AnnotatedPlayer({ mediaRef, title = 'Cosmic Dawn', className }: Props) {
  return (
    <div ref={mediaRef} className={className}>
      <VideoPlayer poster={DEMO_POSTER} title={title}>
        <VideoSkin style={{ width: '100%' }}>
          <HlsVideo src={DEMO_HLS} playsInline crossOrigin="anonymous">
            <track kind="chapters" label="Chapters" srcLang="en" src={DEMO_CHAPTERS} default />
            <track kind="metadata" label="thumbnails" src={STORYBOARD} default />
          </HlsVideo>
        </VideoSkin>
      </VideoPlayer>
    </div>
  );
}
