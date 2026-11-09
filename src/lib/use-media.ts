// Lets a website talk to the player it hosts: finds the <video> the skin renders inside a wrapper and exposes its time,
// play state and a seek helper, so page content (chapter lists, quizzes, buttons) can drive the player.
import { useCallback, useEffect, useRef, useState } from 'react';

export function useMedia() {
  const ref = useRef<HTMLDivElement>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const find = () => {
      const v = root.querySelector('video');
      if (v) setVideo(v);
      return !!v;
    };
    if (find()) return;
    const observer = new MutationObserver(() => {
      if (find()) observer.disconnect();
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!video) return;
    const onTime = () => setTime(video.currentTime);
    const onState = () => setPlaying(!video.paused);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('seeked', onTime);
    video.addEventListener('play', onState);
    video.addEventListener('pause', onState);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('seeked', onTime);
      video.removeEventListener('play', onState);
      video.removeEventListener('pause', onState);
    };
  }, [video]);

  /** Jumps to a time, brings the player into view and starts it. */
  const seek = useCallback(
    (seconds: number, { play = true, scroll = true } = {}) => {
      if (!video) return;
      video.currentTime = seconds;
      setTime(seconds);
      if (play) video.play().catch(() => {});
      if (scroll) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        ref.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      }
    },
    [video],
  );

  return { ref, video, time, playing, seek };
}
