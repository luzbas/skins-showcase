'use client';

import { usePlayer } from '@videojs/react/video';
import { useCallback, useEffect, useMemo, useState } from 'react';

/** A chapter cue, as the player store exposes it from the media's chapters track. */
export interface ChapterCue {
  startTime: number;
  endTime: number;
  text: string;
}

/**
 * How the chapters are drawn, by how many there are:
 * - `full`: every chapter is a full node (1–6).
 * - `collapse`: the playing chapter and its neighbours are full nodes, the rest collapse to pills (7–15).
 * - `parts`: chapters are grouped into parts; the part that's playing opens (16 and more).
 */
export type ChapterMode = 'full' | 'collapse' | 'parts';

/** A run of chapters grouped together in `parts` mode. `from` is inclusive, `to` exclusive. */
export interface ChapterPart {
  index: number;
  from: number;
  to: number;
  startTime: number;
  endTime: number;
}

const NO_CUES: readonly ChapterCue[] = [];

export const FULL_MAX = 6;
export const COLLAPSE_MAX = 15;

export function chapterMode(count: number): ChapterMode {
  if (count <= FULL_MAX) return 'full';
  if (count <= COLLAPSE_MAX) return 'collapse';
  return 'parts';
}

/** Groups chapters into parts of (at most) six, as evenly as the count allows. */
export function makeParts(cues: readonly ChapterCue[]): ChapterPart[] {
  const n = cues.length;
  if (n === 0) return [];
  const count = Math.ceil(n / FULL_MAX);
  const size = Math.ceil(n / count);
  const parts: ChapterPart[] = [];
  for (let from = 0, index = 0; from < n; from += size, index++) {
    const to = Math.min(n, from + size);
    parts.push({
      index,
      from,
      to,
      startTime: cues[from]!.startTime,
      endTime: cues[to - 1]!.endTime,
    });
  }
  return parts;
}

export function formatTime(seconds: number) {
  const s = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export interface ChaptersState {
  cues: readonly ChapterCue[];
  /** The chapter the playhead is in, or -1. */
  index: number;
  /** How far through the playing chapter the playhead is (0–1). */
  progress: number;
  /** Chapters played to (almost) the end in this session. Nothing is stored. */
  watched: ReadonlySet<number>;
  mode: ChapterMode;
  parts: ChapterPart[];
  /** The part the playing chapter belongs to, or -1. */
  partIndex: number;
  duration: number;
  time: number;
  paused: boolean;
}

/** Reads the chapters track and the playhead from the player store, and keeps the session's watched set. */
export function useChapters(): ChaptersState {
  const cues = usePlayer((s) => s.chaptersCues) ?? NO_CUES;
  const time = usePlayer((s) => s.currentTime) ?? 0;
  const duration = usePlayer((s) => s.duration) ?? 0;
  const ended = usePlayer((s) => s.ended) ?? false;
  const paused = usePlayer((s) => s.paused) ?? true;

  const index = cues.findIndex((cue) => time >= cue.startTime && time < cue.endTime);
  const lastIndex = ended && cues.length ? cues.length - 1 : index;
  const current = lastIndex >= 0 ? cues[lastIndex] : undefined;
  const progress = current
    ? ended
      ? 1
      : clamp01((time - current.startTime) / Math.max(0.001, current.endTime - current.startTime))
    : 0;

  // The watched set belongs to this list of chapters; a new chapters track starts it over.
  const cuesKey = `${cues.length}:${cues[0]?.startTime ?? ''}:${cues[cues.length - 1]?.endTime ?? ''}`;
  const [watchedState, setWatched] = useState<{ key: string; set: ReadonlySet<number> }>({ key: '', set: new Set() });
  const watched = watchedState.key === cuesKey ? watchedState.set : EMPTY_SET;

  useEffect(() => {
    if (lastIndex < 0 || progress < 0.95 || watched.has(lastIndex)) return;
    const next = new Set(watched);
    next.add(lastIndex);
    setWatched({ key: cuesKey, set: next });
  }, [lastIndex, progress, watched, cuesKey]);

  const mode = chapterMode(cues.length);
  const parts = useMemo(() => (mode === 'parts' ? makeParts(cues) : []), [mode, cues]);
  const partIndex = lastIndex < 0 ? -1 : parts.findIndex((p) => lastIndex >= p.from && lastIndex < p.to);

  return { cues, index: lastIndex, progress, watched, mode, parts, partIndex, duration, time, paused };
}

const EMPTY_SET: ReadonlySet<number> = new Set();

/** Seeking between chapters and parts. `prev` restarts the playing chapter first if it's more than 3s in. */
export function useChapterNav(state: Pick<ChaptersState, 'cues' | 'index' | 'parts' | 'partIndex' | 'time' | 'paused'>) {
  const store = usePlayer();
  const { cues, index, parts, partIndex, time, paused } = state;

  const goTo = useCallback(
    (i: number, play = true) => {
      const cue = cues[i];
      if (!cue) return;
      void store.seek(cue.startTime);
      if (play && paused) void store.play();
    },
    [cues, store, paused],
  );

  const prev = useCallback(() => {
    if (!cues.length) return;
    if (index >= 0 && time - cues[index]!.startTime > 3) goTo(index, false);
    else goTo(Math.max(0, index - 1), false);
  }, [cues, index, time, goTo]);

  const next = useCallback(() => {
    if (index < cues.length - 1) goTo(index + 1, false);
  }, [cues.length, index, goTo]);

  const prevPart = useCallback(() => {
    if (!parts.length) return prev();
    const part = parts[partIndex];
    if (part && index > part.from) goTo(part.from, false);
    else if (partIndex > 0) goTo(parts[partIndex - 1]!.from, false);
  }, [parts, partIndex, index, goTo, prev]);

  const nextPart = useCallback(() => {
    if (!parts.length) return next();
    if (partIndex < parts.length - 1) goTo(parts[partIndex + 1]!.from, false);
  }, [parts, partIndex, goTo, next]);

  return { goTo, prev, next, prevPart, nextPart };
}
