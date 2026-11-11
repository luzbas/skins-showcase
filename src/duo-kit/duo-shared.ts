// Shared by every skin's Duo layout: which layout a fold calls for, the simulated fullscreen the fold simulator
// provides, and the orientation lock real phones get in fullscreen.
import { createContext, useEffect, type RefObject } from 'react';
import type { FoldableState } from './foldable';

/**
 * The three layouts, chosen from the device's posture (see src/foldable):
 * - 'full': a flat screen, any orientation. Full-bleed picture with paper controls floating over it, like the web
 *   papercut player.
 * - 'split': folded with the segments stacked (tabletop). Picture in the top segment, the paper board in the bottom.
 *   Real devices get it only while the player is fullscreen, as the segments then describe the player.
 * - 'outer-p' / 'outer-l': the Duo's closed outer display, picture beside a 73 pt edge rail (simulation only: a real
 *   page can't tell the outer display apart, so it gets 'full' there).
 */
export type DuoLayout = 'full' | 'split' | 'outer-p' | 'outer-l';

export function duoLayoutFor(state: FoldableState): DuoLayout {
  if (state.display !== 'inner') return state.display;
  const tabletop = state.posture === 'folded' && state.split === 'vertical';
  return tabletop && (state.simulated || state.fullscreen) ? 'split' : 'full';
}

/**
 * Fullscreen inside the Duo simulation. Real browser fullscreen would lift the player out of the drawn phone, so the
 * simulation provides this instead and plays fullscreen out on the mockup (turning the phone to suit the video).
 */
export interface SimulatedFullscreenValue {
  active: boolean;
  toggle: () => void;
}
export const SimulatedFullscreen = createContext<SimulatedFullscreenValue | null>(null);

/** Landscape for wide video, portrait for tall (9:16 clips); null until the video's size is known. */
export function fullscreenOrientationFor(video: HTMLVideoElement | null | undefined): 'landscape' | 'portrait' | null {
  if (!video?.videoWidth || !video.videoHeight) return null;
  return video.videoWidth >= video.videoHeight ? 'landscape' : 'portrait';
}

/**
 * On a real phone, fullscreen turns the screen to suit the video: landscape for wide video, portrait for tall. Uses
 * the Screen Orientation API, which Android browsers honour in fullscreen; iOS Safari ignores it, so there the person
 * turns the phone and the layout follows. Unlocked again on leaving fullscreen.
 */
export function useFullscreenOrientationLock(ref: RefObject<HTMLElement | null>, fullscreen: boolean) {
  useEffect(() => {
    const orientation = screen.orientation as ScreenOrientation & { lock?: (type: string) => Promise<void> };
    if (!fullscreen || !orientation?.lock) return;
    const target = fullscreenOrientationFor(ref.current?.querySelector('video'));
    if (!target) return;
    orientation.lock(target).catch(() => {
      // Not supported or refused (desktop browsers, iOS): nothing to do.
    });
    return () => {
      try {
        orientation.unlock();
      } catch {
        // Already unlocked.
      }
    };
  }, [ref, fullscreen]);
}
