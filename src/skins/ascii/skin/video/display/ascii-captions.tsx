/** @jsxImportSource react */

'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The ASCII screen covers the real `<video>`, so its native captions would be hidden under the glyphs. This draws the
 * showing caption or subtitle cues over the screen instead, as terminal text. It is hidden from assistive tech: the
 * cues are the same text the video's own track exposes. While the plain video shows (fallback), it renders nothing and
 * the native captions are used.
 */
export function AsciiCaptions() {
  const ref = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    const container = ref.current?.closest('.media-container');
    if (!container) return undefined;

    const read = () => {
      const video = container.querySelector('video');
      if (!video) return;
      const lines: string[] = [];
      for (const track of Array.from(video.textTracks)) {
        if (track.mode !== 'showing' || (track.kind !== 'captions' && track.kind !== 'subtitles')) continue;
        for (const cue of Array.from(track.activeCues ?? [])) {
          const value = (cue as VTTCue).text ?? '';
          lines.push(value.replace(/<[^>]+>/g, ''));
        }
      }
      const next = lines.join('\n');
      setText((previous) => (previous === next ? previous : next));
    };

    read();
    const timer = window.setInterval(read, 200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div ref={ref} className={'ax-cue-layer'} aria-hidden="true">
      {text ? (
        <p className={'ax-cue'}>
          {text.split('\n').map((line, index) => (
            <span key={index}>{line}</span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
