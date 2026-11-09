// The Papercut skin as a site would embed it. Every variation uses this same component, unchanged.
import type { Ref } from 'react';
import { VideoPlayer } from '@videojs/react/video';
import { HlsVideo } from '@videojs/react/media/hls-video';
import { CollageVideoSkin } from '../skins/papercut/collage/collage-skin';
import { DEMO_CHAPTERS, DEMO_HLS, DEMO_POSTER } from '../media';

interface Props {
  mediaRef?: Ref<HTMLDivElement>;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function PapercutPlayer({ mediaRef, title = 'Cosmic Dawn', subtitle, className }: Props) {
  return (
    <div ref={mediaRef} className={className}>
      <VideoPlayer poster={DEMO_POSTER}>
        <CollageVideoSkin title={title} subtitle={subtitle}>
          <HlsVideo src={DEMO_HLS} playsInline crossOrigin="">
            <track kind="chapters" label="English" srcLang="en" src={DEMO_CHAPTERS} default />
          </HlsVideo>
        </CollageVideoSkin>
      </VideoPlayer>
    </div>
  );
}
