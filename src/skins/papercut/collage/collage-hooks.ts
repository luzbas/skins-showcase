// Shared helpers for the collage layout (originally in the papercut Duo layout).
import { useEffect, type RefObject } from 'react';

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

/**
 * Keeps captions clear of the full-screen layout's control strip. Browsers don't let CSS move native captions, so
 * while the strip shows, each subtitle cue is moved up a few caption lines (VTTCue.line = -5) so it clears the strip, and
 * goes back to its own position when the controls hide or another layout takes over.
 */
export function useCaptionsAboveStrip(ref: RefObject<HTMLElement | null>, lift: boolean) {
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    // The streaming player inserts its <video> after mount, so look it up each time rather than once.
    const apply = () => {
      const video = host.querySelector('video');
      if (!video) return;
      const target = lift ? -5 : 'auto';
      for (const track of Array.from(video.textTracks)) {
        if (track.kind !== 'subtitles' && track.kind !== 'captions') continue;
        const active = new Set(Array.from(track.activeCues ?? []));
        let movedOnScreen = false;
        for (const cue of Array.from(track.cues ?? [])) {
          if (!('line' in cue) || (cue as VTTCue).line === target) continue;
          (cue as VTTCue).line = target;
          if (active.has(cue)) movedOnScreen = true;
        }
        // A caption already on screen keeps its old place until the browser lays captions out again; re-showing the
        // track makes it do that now (otherwise a paused video would leave it sitting on the strip).
        if (movedOnScreen && track.mode === 'showing') {
          track.mode = 'hidden';
          track.mode = 'showing';
        }
      }
    };
    apply();
    // Media events don't bubble, so listen in the capture phase. New cues load as the stream plays and when the
    // language changes; timeupdate and loadedmetadata catch both.
    host.addEventListener('timeupdate', apply, true);
    host.addEventListener('loadedmetadata', apply, true);
    return () => {
      host.removeEventListener('timeupdate', apply, true);
      host.removeEventListener('loadedmetadata', apply, true);
    };
  }, [ref, lift]);
}
