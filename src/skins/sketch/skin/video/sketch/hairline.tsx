/** @jsxImportSource react */

import { usePlayer } from '@videojs/react';
import { selectTime } from '@videojs/core/dom';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { PENS, seedOf, stroke } from './pen';

const HAIRLINE = { ...PENS.track, w: 1.6, bow: 1, fine: 0.2, over: 0 };

/**
 * The pin row asleep: while the board is hidden in fullscreen, one pencil hairline along the bottom
 * edge keeps showing progress, red up to the playhead. Decorative; the time slider stays the control.
 */
export function SketchHairline() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const time = usePlayer(selectTime);
  const progress = time && time.duration > 0 ? Math.min(1, Math.max(0, time.currentTime / time.duration)) : 0;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.round(el.offsetWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Drawn once per width; progress only moves the clip, so the line never redraws as it plays.
  const line = useMemo(() => (width > 2 ? stroke([[0, 4], [width, 4]], HAIRLINE, seedOf('hairline')) : ''), [width]);

  return (
    <div ref={ref} className={'sketch-hairline'} aria-hidden="true" style={{ ['--sketch-progress' as string]: `${progress * 100}%` }}>
      <svg width={width} height={8} viewBox={`0 0 ${width} 8`} className={'sketch-hairline-rest'}>
        <path d={line} />
      </svg>
      <svg width={width} height={8} viewBox={`0 0 ${width} 8`} className={'sketch-hairline-played'}>
        <path d={line} />
      </svg>
    </div>
  );
}
