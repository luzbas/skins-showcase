// The demo trailer's chapters (mirrors public/cosmic-dawn-chapters.vtt) so the sites can list and jump to them.
export interface Chapter {
  start: number;
  end: number;
  title: string;
}

export const CHAPTERS: Chapter[] = [
  { start: 0, end: 20, title: 'A Never-Before-Seen Look' },
  { start: 20, end: 52, title: 'The Voyage to Cosmic Dawn' },
  { start: 52, end: 73, title: 'Building and Launching Webb' },
  { start: 73, end: 111.143, title: 'The Challenges and Promise of Webb' },
];

export function chapterAt(time: number): number {
  const i = CHAPTERS.findIndex((c) => time >= c.start && time < c.end);
  return i === -1 ? CHAPTERS.length - 1 : i;
}

export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
