/** @jsxImportSource react */

import { usePlayer } from '@videojs/react';
import { selectPlayback, selectTextTrack, selectTime, selectVolume } from '@videojs/core/dom';
import { useEffect, useMemo, useRef, useState } from 'react';

import { SketchLead, useOwnSize } from './drawing';
import { PENS, box, loop, random, seedOf, stroke, type Pen, type Point } from './pen';

/* The design's pens for the board drawing, in board units (1/1280 of the board's width). */
const BOARD_PENS = {
  bold: { w: 2.1, bow: 1.2, bowk: 0.008, fine: 0.3, wave: 10, step: 1.2, land: 5, lift: 6, over: 1.5 },
  line: { w: 1.4, bow: 1.6, bowk: 0.006, fine: 0.28, wave: 14, step: 2, land: 5, lift: 7, over: 2 },
  hair: { w: 0.85, bow: 0.8, bowk: 0.008, fine: 0.15, wave: 9, step: 2, land: 2, lift: 3, over: 1.2 },
} satisfies Record<string, Pen>;

const f = (n: number) => Math.round(n * 10) / 10;

function dot(x: number, y: number, r = 3.2) {
  return `M${f(x - r)} ${f(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
}

function rect(x: number, y: number, w: number, h: number, pen: Pen, seed: number) {
  return stroke(box(x, y, w, h, 0.8), pen, seed, true);
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.round(Number.isFinite(seconds) ? seconds : 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(r).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * The fixed drawing of the wide board, in a 1280 × 800 view box that scales with the player: the
 * chip's package around the video, the traces from the chip's pins to the pads, the volume ladder,
 * and the connector bus, and a scatter of vias. Parts that move or can be missing
 * (settings chips, connectors) draw their own traces.
 */
export function SchematicArt() {
  const d = useMemo(() => {
    const ink: string[] = [];
    const soft: string[] = [];
    let k = 0;
    const seed = () => seedOf('schematic') + (k += 1.37);
    const add = (to: string[], pts: Point[], pen: Pen, closed = false) => to.push(stroke(pts, pen, seed(), closed));

    // vias and a few stray traces, in the board's empty corners
    const next = random(5);
    const areas = [[40, 40, 300, 170], [990, 480, 1240, 600], [40, 712, 340, 775], [990, 736, 1240, 778]];
    for (let i = 0; i < 44; i++) {
      const [x0, y0, x1, y1] = areas[i % 4];
      const x = x0 + next() * (x1 - x0);
      const y = y0 + next() * (y1 - y0);
      const r = 2.5 + next() * 2.5;
      add(soft, loop(x, y, r, r, seed(), 10), BOARD_PENS.hair);
    }
    add(soft, [[40, 180], [120, 180], [150, 150], [300, 150]], BOARD_PENS.hair);
    add(soft, [[990, 760], [1100, 760], [1120, 740], [1240, 740]], BOARD_PENS.hair);
    add(soft, [[60, 760], [200, 760], [230, 730], [330, 730]], BOARD_PENS.hair);
    add(soft, [[1000, 520], [1060, 520], [1090, 550], [1240, 550]], BOARD_PENS.hair);

    // the chip: the video's package
    ink.push(rect(322, 182, 636, 374, BOARD_PENS.bold, seed()));
    ink.push(rect(330, 190, 620, 358, BOARD_PENS.hair, seed()));

    // traces from the chip's left pins to the pads and the volume ladder
    add(ink, [[322, 369], [196, 369]], BOARD_PENS.line);
    add(ink, [[322, 320], [262, 320], [198, 256]], BOARD_PENS.line);
    add(ink, [[322, 418], [262, 418], [198, 482]], BOARD_PENS.line);
    add(ink, [[322, 500], [290, 500], [262, 528], [262, 638]], BOARD_PENS.line);
    for (const y of [320, 369, 418, 500]) ink.push(dot(322, y));

    // the connector bus turns down into the chip's corner
    add(ink, [[1026, 150], [990, 150], [970, 170], [970, 196], [960, 196]], BOARD_PENS.line);
    ink.push(dot(958, 196));

    return { ink: ink.join(''), soft: soft.join('') };
  }, []);

  return (
    <svg className={'sketch-art'} viewBox="0 0 1280 800" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path className={'sketch-art-soft'} d={d.soft} />
      <path className={'media-sketch-ink'} d={d.ink} />
    </svg>
  );
}

/** The red stem and ring under the time slider's pins, marking the playhead. */
export function SketchPlayhead() {
  const d = useMemo(() => {
    const s = seedOf('playhead');
    return stroke([[8, 0], [8, 16]], PENS.lead, s) + stroke(loop(8, 23, 5.5, 5.5, s + 3, 15), PENS.lead, s + 4);
  }, []);
  return (
    <svg className={'sketch-playhead'} width="16" height="30" viewBox="0 0 16 30" aria-hidden="true" focusable="false">
      <path d={d} />
    </svg>
  );
}

function usePlaybackTime() {
  const time = usePlayer(selectTime);
  const duration = time && Number.isFinite(time.duration) && time.duration > 0 ? time.duration : 0;
  const current = time?.currentTime ?? 0;
  return { time, duration, current, progress: duration ? Math.min(1, Math.max(0, current / duration)) : 0 };
}

/**
 * The chip's top pins are the chapters: one group of pins per chapter, a gap at each boundary, the
 * current chapter in red pencil, its label above. Each label is a button that seeks to its chapter.
 * Without chapters the pins are a plain row.
 */
export function ChapterRow() {
  const cues = usePlayer(selectTextTrack)?.chaptersCues ?? [];
  const { time, duration, current } = usePlaybackTime();
  const end = duration || cues.at(-1)?.endTime || 0;
  const ref = useRef<HTMLSpanElement>(null);
  const size = useOwnSize(ref);

  const starts = cues.map((cue) => cue.startTime).join(',');
  const pins = useMemo(() => {
    if (!size || size.w < 40) return null;
    const { w, h } = size;
    const n = Math.max(8, Math.round(w / 15));
    const pitch = w / n;
    const pinW = Math.min(8, pitch * 0.55);
    const bounds = end
      ? starts
          .split(',')
          .slice(1)
          .map((s) => Math.round((Number(s) / end) * (n - 1)))
      : [];
    const groups: string[] = [];
    let group = 0;
    for (let i = 0; i < n; i++) {
      if (bounds.includes(i)) {
        group = bounds.filter((b) => b <= i).length;
        continue;
      }
      const x = i * pitch + (pitch - pinW) / 2;
      groups[group] = (groups[group] ?? '') + stroke(box(x, 0.5, pinW, h - 1, 0.6), PENS.hair, seedOf('chapters') + i * 0.37, true);
    }
    return { groups, fill: '' };
  }, [size, starts, end]);

  const active = cues.findIndex((cue, i) => current >= cue.startTime && (current < cue.endTime || i === cues.length - 1));

  return (
    <div className={'sketch-chapters'} data-empty={cues.length ? undefined : ''}>
      {end > 0 &&
        cues.map((cue, i) => {
          const left = (cue.startTime / end) * 100;
          const width = ((cue.endTime - cue.startTime) / end) * 100;
          const number = String(i + 1).padStart(2, '0');
          return (
            <button
              key={`${cue.startTime}-${i}`}
              type="button"
              className={'sketch-chapter'}
              aria-current={i === active ? 'true' : undefined}
              aria-label={`Chapter ${i + 1}: ${cue.text}`}
              style={{ left: `${left}%`, ['--sketch-chapter-width' as string]: `${width}%` }}
              onClick={() => time?.seek(cue.startTime)}
            >
              <span className={'sketch-chapter-number'}>({number})</span> <span className={'sketch-chapter-title'}>{cue.text}</span>
            </button>
          );
        })}
      <span ref={ref} className={'sketch-chapter-pins'} aria-hidden="true">
        <svg width={size?.w ?? 0} height={size?.h ?? 0} viewBox={`0 0 ${size?.w ?? 0} ${size?.h ?? 0}`} focusable="false">
          {pins?.groups.map((d, i) => (
            <path key={i} className={i === active ? 'sketch-chapter-pins-current' : 'media-sketch-ink'} d={d} />
          ))}
        </svg>
      </span>
    </div>
  );
}

/**
 * The chapters as a printed list under the chip (board and stacked layouts): number, title and start
 * time per chapter, laid out across the board. The current chapter is in red pencil and underlined;
 * each entry seeks to its chapter.
 */
export function ChapterList() {
  const cues = usePlayer(selectTextTrack)?.chaptersCues ?? [];
  const { time, current } = usePlaybackTime();
  if (!cues.length) return null;
  const active = cues.findIndex((cue, i) => current >= cue.startTime && (current < cue.endTime || i === cues.length - 1));

  return (
    <nav className={'sketch-chapter-list'} aria-label="Chapters">
      <span className={'sketch-label'} aria-hidden="true">
        CHAPTERS
      </span>
      <ol className={'sketch-chapter-items'}>
        {cues.map((cue, i) => (
          <li key={`${cue.startTime}-${i}`}>
            <button
              type="button"
              className={'sketch-chapter-item'}
              aria-current={i === active ? 'true' : undefined}
              onClick={() => time?.seek(cue.startTime)}
            >
              <span className={'sketch-chapter-item-number'}>({String(i + 1).padStart(2, '0')})</span>
              <span className={'sketch-chapter-item-title'}>{cue.text}</span>
              <span className={'sketch-chapter-item-time'}>{formatClock(cue.startTime)}</span>
              {i === active && <SketchLead className={'sketch-chapter-item-underline'} dot="none" />}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Time labels under the pin row: start, quarters and end. Decorative; the slider carries the value. */
export function TimeTicks() {
  const { duration } = usePlaybackTime();
  if (!duration) return null;
  return (
    <div className={'sketch-ticks'} aria-hidden="true">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <span key={t} className={'sketch-tick'} style={{ left: `${t * 100}%` }}>
          {formatClock(duration * t)}
        </span>
      ))}
    </div>
  );
}

/** Sets `--sketch-progress` (0–1) on a wrapper, so a part can follow the playhead in CSS. */
export function useProgressStyle() {
  const { progress } = usePlaybackTime();
  return { ['--sketch-p' as string]: progress.toFixed(4) };
}

/** The running timecode printed in the video's top corner, like a test pattern's burn-in. */
export function VideoTimecode() {
  const paused = usePlayer(selectPlayback)?.paused ?? true;
  const { current } = usePlaybackTime();
  const s = Math.floor(current);
  const code = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
  return (
    <div className={'sketch-timecode'} aria-hidden="true">
      {paused ? '❚❚' : '▶'} {code}
    </div>
  );
}

/** The volume ladder's printed value. */
export function VolumeReading() {
  const volume = usePlayer(selectVolume);
  const text = !volume ? '' : volume.muted ? 'MUTED' : `${Math.round(volume.volume * 100)}%`;
  return <span className={'sketch-volume-value'}>{text}</span>;
}

function cueText(cue: TextTrackCue) {
  const text = (cue as VTTCue).text ?? '';
  return text.replace(/<[^>]+>/g, '').trim();
}

/**
 * Captions over the bottom of the picture: the showing caption or subtitle track's current cues,
 * centred on a paper strip. The browser's own cue box is hidden by sketch.css, because it can land
 * in the middle of the picture (cue line settings, or a video box laid out by the skin) and leaves
 * an empty dark box behind. Decorative for assistive technology, which reads captions from the
 * media itself. Shows nothing while captions are off or between cues.
 */
export function VideoCaptions() {
  const ref = useRef<HTMLDivElement>(null);
  const showing = usePlayer(selectTextTrack)?.subtitlesShowing ?? false;
  const [text, setText] = useState('');

  useEffect(() => {
    const video = ref.current?.closest('.media-skin')?.querySelector('video');
    const list = video?.textTracks;
    if (!list) return;

    let tracks: TextTrack[] = [];
    const read = () => {
      const lines: string[] = [];
      for (const track of tracks) {
        if (track.mode !== 'showing') continue;
        for (const cue of Array.from(track.activeCues ?? [])) {
          const t = cueText(cue);
          if (t) lines.push(t);
        }
      }
      setText(lines.join('\n'));
    };
    const bind = () => {
      for (const track of tracks) track.removeEventListener('cuechange', read);
      tracks = Array.from(list).filter((t) => t.kind === 'captions' || t.kind === 'subtitles');
      for (const track of tracks) track.addEventListener('cuechange', read);
      read();
    };
    bind();
    list.addEventListener('addtrack', bind);
    list.addEventListener('removetrack', bind);
    list.addEventListener('change', read);
    return () => {
      for (const track of tracks) track.removeEventListener('cuechange', read);
      list.removeEventListener('addtrack', bind);
      list.removeEventListener('removetrack', bind);
      list.removeEventListener('change', read);
    };
  }, []);

  const shown = showing ? text : '';
  return (
    <div ref={ref} className={'sketch-captions'} data-empty={shown ? undefined : ''} aria-hidden="true">
      {shown && <span className={'sketch-captions-text'}>{shown}</span>}
    </div>
  );
}
