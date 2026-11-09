import { usePlayer } from '@videojs/react';
import { selectFullscreen } from '@videojs/core/dom';
import { useEffect, useLayoutEffect, useState } from 'react';

/**
 * `board`: the video sits in the middle as a chip, the controls are wired around it.
 * `stack`: narrow players; the board continues under the video.
 * `overlay`: fullscreen; the video fills the screen and the board is laid over it, hiding when idle.
 */
export type SketchLayout = 'board' | 'stack' | 'overlay';

/** Widths at and above this use the board; it needs room on both sides of the video. */
export const BOARD_MIN_WIDTH = 880;

/** Height the stacked board adds under the 16:9 video. Matches the stacked layout in board.css. */
const STACK_EXTRA = 560;
/** Side gutter around the video in the stacked layout. Matches board.css. */
const STACK_GUTTER = 28;

export function useSketchLayout(root: HTMLElement | null) {
  const isFullscreen = usePlayer(selectFullscreen)?.isFullscreen ?? false;
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (!root) return;
    const measure = () => setWidth(root.offsetWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [root]);

  const layout: SketchLayout = isFullscreen ? 'overlay' : width === 0 || width >= BOARD_MIN_WIDTH ? 'board' : 'stack';
  const stackHeight = Math.round(((width - STACK_GUTTER * 2) * 9) / 16 + STACK_EXTRA);

  return { layout, stackHeight };
}

/**
 * In fullscreen, samples the video's edges a couple of times a second and marks the player
 * `data-tone="light"` or `"dark"`, so the wash under the controls can follow the picture. Frames
 * that can't be read (a cross-origin video without CORS) leave it dark, which the paper parts and
 * line halos keep readable anyway.
 */
export function useFrameTone(root: HTMLElement | null, active: boolean) {
  useEffect(() => {
    if (!root || !active) return;

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 18;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let tone: 'light' | 'dark' = 'dark';
    let readable = true;
    root.dataset.tone = tone;

    const sample = () => {
      const video = root.querySelector('video');
      if (!ctx || !readable || !video || video.readyState < 2) return;
      try {
        ctx.drawImage(video, 0, 0, 32, 18);
        const data = ctx.getImageData(0, 0, 32, 18).data;
        let sum = 0;
        let count = 0;
        for (let y = 0; y < 18; y++) {
          for (let x = 0; x < 32; x++) {
            if (x >= 7 && x < 25 && y >= 4 && y < 14) continue;
            const i = (y * 32 + x) * 4;
            sum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
            count++;
          }
        }
        const luminance = sum / count;
        // Hysteresis, so a frame near the middle doesn't flicker between washes.
        const next = tone === 'dark' ? (luminance > 0.6 ? 'light' : 'dark') : luminance < 0.45 ? 'dark' : 'light';
        if (next !== tone) {
          tone = next;
          root.dataset.tone = tone;
        }
      } catch {
        readable = false;
      }
    };

    sample();
    const timer = window.setInterval(sample, 500);
    return () => {
      window.clearInterval(timer);
      delete root.dataset.tone;
    };
  }, [root, active]);
}

/**
 * On a phone, fullscreen turns the screen to suit the video: landscape for wide video, portrait for tall. Android
 * browsers honour the Screen Orientation API once the player is fullscreen. iPhones play fullscreen video in Safari's
 * own player, which follows the phone's rotation by itself, and ignore the API. Unlocked again on leaving fullscreen.
 */
export function useFullscreenOrientationLock(root: HTMLElement | null, active: boolean) {
  useEffect(() => {
    const orientation = screen.orientation as ScreenOrientation & { lock?: (type: string) => Promise<void> };
    if (!root || !active || !orientation?.lock) return;
    const video = root.querySelector('video');
    const tall = !!video?.videoWidth && !!video.videoHeight && video.videoHeight > video.videoWidth;
    orientation.lock(tall ? 'portrait' : 'landscape').catch(() => {
      // Not supported or refused (desktop browsers, iOS): nothing to do.
    });
    return () => {
      try {
        orientation.unlock();
      } catch {
        // Already unlocked.
      }
    };
  }, [root, active]);
}
