/** @jsxImportSource react */

'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * In the 3D layout the real `<video>` is invisible (the sheet shows it), so its native captions would be
 * invisible too. This draws the showing caption or subtitle cues over the sheet instead. It is hidden from
 * assistive tech: the cues are the same text the video's own track exposes.
 */
export function PicnicCaptions() {
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
    <div ref={ref} className={'picnic-cue-layer'} aria-hidden="true">
      {text ? (
        <p className={'picnic-cue'}>
          {text.split('\n').map((line, index) => (
            <span key={index}>{line}</span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
