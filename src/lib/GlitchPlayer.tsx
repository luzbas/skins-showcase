// The ASCII Glitch skin as a site would embed it: the schematic board, with the video as its central node.
import type { Ref } from 'react';
import { VideoPlayer } from '@videojs/react/video';
import { HlsVideo } from '@videojs/react/media/hls-video';
import { SchematicVideoSkin } from '../skins/ascii/schematic/schematic-skin';
import { DEMO_CHAPTERS, DEMO_HLS, DEMO_POSTER } from '../media';

interface Props {
  mediaRef?: Ref<HTMLDivElement>;
  title?: string;
  className?: string;
}

export function GlitchPlayer({ mediaRef, title = 'Cosmic Dawn', className }: Props) {
  return (
    <div ref={mediaRef} className={className}>
      <VideoPlayer poster={DEMO_POSTER}>
        <SchematicVideoSkin title={title}>
          {/* crossOrigin lets WebGL read the frames for the glyph screen and lets the chapters track load. */}
          <HlsVideo src={DEMO_HLS} playsInline crossOrigin="anonymous">
            <track kind="chapters" label="English" srcLang="en" src={DEMO_CHAPTERS} default />
          </HlsVideo>
        </SchematicVideoSkin>
      </VideoPlayer>
    </div>
  );
}
