// The Clay skin as a site would embed it: the clay TV on its floating island.
import type { Ref } from 'react';
import { VideoPlayer } from '@videojs/react/video';
import { HlsVideo } from '@videojs/react/media/hls-video';
import { VideoSkin } from '../skins/clay/skin/video/skin';
import { DEMO_CHAPTERS, DEMO_HLS, DEMO_POSTER } from '../media';

interface Props {
  mediaRef?: Ref<HTMLDivElement>;
  title?: string;
  className?: string;
}

export function ClayPlayer({ mediaRef, title = 'Cosmic Dawn', className }: Props) {
  return (
    <div ref={mediaRef} className={className}>
      <VideoPlayer poster={DEMO_POSTER} title={title}>
        <VideoSkin style={{ width: '100%' }}>
          <HlsVideo src={DEMO_HLS} playsInline crossOrigin="anonymous">
            <track kind="chapters" label="English" srcLang="en" src={DEMO_CHAPTERS} default />
          </HlsVideo>
        </VideoSkin>
      </VideoPlayer>
    </div>
  );
}
