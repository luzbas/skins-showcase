// The Picnic Cinema skin as a site would embed it: an outdoor movie night in a garden, the video on a sheet between two
// posts and the controls hanging as tags from a string of festoon bulbs. 16:9 on wide screens; on phones the player
// turns upright and the skin switches to its portrait framing.
import type { Ref } from 'react';
import { VideoPlayer } from '@videojs/react/video';
import { HlsVideo } from '@videojs/react/media/hls-video';
import { VideoSkin } from '../skins/picnic/skin/video/skin';
import { USHER_HLS, USHER_POSTER, USHER_TITLE } from '../media';
import './picnic-player.css';

interface Props {
  mediaRef?: Ref<HTMLDivElement>;
  title?: string;
  className?: string;
}

export function PicnicPlayer({ mediaRef, title = USHER_TITLE, className }: Props) {
  return (
    <div ref={mediaRef} className={className}>
      <VideoPlayer poster={USHER_POSTER} title={title}>
        <VideoSkin className="picnic-embed">
          {/* crossOrigin lets WebGL read the video frames for the sheet and its light. */}
          <HlsVideo src={USHER_HLS} playsInline crossOrigin="anonymous" />
        </VideoSkin>
      </VideoPlayer>
    </div>
  );
}
