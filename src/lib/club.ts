// Shared bits for the Cut-Out Cosmos Club variations: club facts, saved state, and helpers.
import { useEffect, useState } from 'react';

export const CLUB = {
  name: 'Cut-Out Cosmos Club',
  where: 'Library basement, room B',
  when: 'Saturdays, 10:30',
  ages: 'Ages 6 to 11, grown-ups welcome',
};

/** Still frames from the demo stream (Mux thumbnails), for chapter cards and photos. */
export const frameAt = (seconds: number, width = 480) =>
  `https://image.mux.com/83EzHOvVzVN01AsrD01BCpiH02Pj3S8mfzBOu101w2nHC5s/thumbnail.webp?time=${seconds}&width=${width}`;

/** A small deterministic random, so hand-cut shapes look the same on every visit. */
export function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/** A slightly wonky rectangle, like it was cut out by hand. */
export function scissorCut(seed: number, depth = 7) {
  const j = (n: number) => +(rand(seed + n) * depth).toFixed(1);
  return `polygon(${j(1)}% ${j(2)}%, ${100 - j(3)}% ${j(4)}%, ${100 - j(5)}% ${100 - j(6)}%, ${j(7)}% ${100 - j(8)}%)`;
}

/** State remembered in this browser. Falls back to plain state when storage is blocked. */
export function useSaved<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`club:${key}`);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(`club:${key}`, JSON.stringify(value));
    } catch {
      // Storage unavailable: keep it in memory only.
    }
  }, [key, value]);
  return [value, setValue] as const;
}

/** The next Saturday at 10:30 local time (today counts if it's before 10:30). */
export function nextMeeting(now = new Date()) {
  const d = new Date(now);
  d.setHours(10, 30, 0, 0);
  const add = (6 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + add);
  if (d <= now) d.setDate(d.getDate() + 7);
  return d;
}

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
