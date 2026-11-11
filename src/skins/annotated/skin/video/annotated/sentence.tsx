/** @jsxImportSource react */

'use client';

import {
  CaptionsButton as CaptionsButtonPrimitive,
  Menu,
  MuteButton as MuteButtonPrimitive,
  PlayButton as PlayButtonPrimitive,
  SeekButton as SeekButtonPrimitive,
  VolumePopover as VolumePopoverPrimitive,
} from '@videojs/react';
import { usePlayer } from '@videojs/react/video';

import { RadioItem } from '../../ui/radio-item';
import { VolumeSlider } from '../../ui/volume-slider';
import { cn } from '../../lib/resolve-class-name';

import { formatTime, useChapterNav, useChapters, type ChaptersState } from './chapters';
import { usePopupMode } from './popups';

/**
 * The controls, written as a sentence. Every highlighted word is a real button (or menu trigger) whose accessible
 * name starts with the word you see, so voice control ("click paused") and screen readers agree with the page.
 * `compact` drops the connecting prose, for the fullscreen strip.
 */
export function Sentence({ compact = false }: { compact?: boolean }) {
  const state = useChapters();
  const nav = useChapterNav(state);
  const hasChapters = state.cues.length > 0;

  if (compact) {
    return (
      <p className={cn('ap-sentence', 'ap-sentence--compact')}>
        <PlayChip />
        {hasChapters ? (
          <>
            {' '}in <ChapterChip state={state} goTo={nav.goTo} />
          </>
        ) : null}{' '}
        at <SpeedChip /> with <CaptionsChip short />, volume <VolumeChip /> — <SeekChip seconds={-10} />{' '}
        <SeekChip seconds={10} />
      </p>
    );
  }

  return (
    <p className={'ap-sentence'}>
      <span className={'ap-dropcap'}>T</span>he film is <PlayChip /> at{' '}
      <time className={'ap-num'}>{formatTime(state.time)}</time>
      {hasChapters ? (
        <>
          , in the chapter called <ChapterChip state={state} goTo={nav.goTo} />
        </>
      ) : null}
      . It runs at <SpeedChip long /> with <CaptionsChip /> and the volume at <VolumeChip />. You may turn{' '}
      <SeekChip seconds={-10} /> or read <SeekChip seconds={10} />.
    </p>
  );
}

function PlayChip() {
  const paused = usePlayer((s) => s.paused) ?? true;
  const ended = usePlayer((s) => s.ended) ?? false;
  const word = ended ? 'finished' : paused ? 'paused' : 'playing';
  const action = ended ? 'play again' : paused ? 'play' : 'pause';
  return (
    <PlayButtonPrimitive className={'ap-chip'} data-tone="pink" aria-label={`${word}, ${action}`}>
      {word}
    </PlayButtonPrimitive>
  );
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function ChapterChip({ state, goTo }: { state: ChaptersState; goTo: (i: number, play?: boolean) => void }) {
  const cue = state.index >= 0 ? state.cues[state.index] : undefined;
  const word = cue?.text ?? 'the opening';
  const popup = usePopupMode();
  return (
    <Menu.Root side="top" align="start" open={popup.open} onOpenChange={(open) => popup.setOpen(open)}>
      <Menu.Trigger
        render={<button type="button" />}
        className={'ap-chip'}
        data-tone="green"
        aria-label={`${word}, choose a chapter`}
      >
        {word}
      </Menu.Trigger>
      <Menu.Popup className={cn('media-popup', 'media-popup-surface', 'media-menu-popup', 'ap-popup')} {...popup.popupProps}>
        <Menu.Content className={'media-menu-content'}>
          <Menu.RadioGroup
            className={'media-menu-radio-group'}
            value={String(state.index)}
            onValueChange={(value) => goTo(Number(value), false)}
          >
            {state.cues.map((c, i) => (
              <RadioItem key={`${c.startTime}-${i}`} value={String(i)}>
                <span className={'ap-menu-chapter'}>
                  <span className={'ap-menu-num'}>{ROMAN[i] ?? i + 1}</span>
                  <span>{c.text}</span>
                  <span className={cn('ap-menu-time', 'ap-num')}>{formatTime(c.startTime)}</span>
                </span>
              </RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  );
}

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** Each press steps to the next speed, then back round. */
function SpeedChip({ long = false }: { long?: boolean }) {
  const store = usePlayer();
  const rate = usePlayer((s) => s.playbackRate) ?? 1;
  const rates = usePlayer((s) => s.playbackRates);
  const list = rates && rates.length > 1 ? [...rates] : RATES;
  const next = list[(list.indexOf(rate) + 1) % list.length] ?? 1;
  const word = long ? `${rate}× speed` : `${rate}×`;
  return (
    <button
      type="button"
      className={'ap-chip'}
      data-tone="yellow"
      aria-label={`${word}, change to ${next}×`}
      onClick={() => store.setPlaybackRate(next)}
    >
      {word}
    </button>
  );
}

function CaptionsChip({ short = false }: { short?: boolean }) {
  const tracks = usePlayer((s) => s.textTrackList);
  const showing = usePlayer((s) => s.subtitlesShowing) ?? false;
  const subs = (tracks ?? []).filter((t) => t.kind === 'subtitles' || t.kind === 'captions');
  if (!subs.length) return <span className={'ap-plain'}>no captions</span>;
  const active = subs.find((t) => t.mode === 'showing');
  const word = showing
    ? short
      ? 'captions'
      : `${active?.label || 'the'} captions`
    : 'captions off';
  return (
    <CaptionsButtonPrimitive
      className={'ap-chip'}
      data-tone="blue"
      data-off={!showing || undefined}
      aria-label={`${word}, turn captions ${showing ? 'off' : 'on'}`}
    >
      {word}
    </CaptionsButtonPrimitive>
  );
}

/** Pressing the number mutes; hovering or focusing it opens a slider. */
function VolumeChip() {
  const volume = usePlayer((s) => s.volume) ?? 1;
  const muted = usePlayer((s) => s.muted) ?? false;
  const word = muted ? 'muted' : String(Math.round(volume * 100));
  const popup = usePopupMode();
  return (
    <VolumePopoverPrimitive.Root
      openOnHover
      delay={200}
      closeDelay={150}
      side="top"
      open={popup.open}
      onOpenChange={(open) => popup.setOpen(open)}
    >
      <VolumePopoverPrimitive.Trigger
        render={
          <MuteButtonPrimitive
            className={'ap-chip'}
            data-tone="lavender"
            aria-label={`${word === 'muted' ? 'volume muted' : `volume ${word}`}, ${muted ? 'unmute' : 'mute'}`}
          >
            {word}
          </MuteButtonPrimitive>
        }
      />
      <VolumePopoverPrimitive.Popup
        className={cn(
          'media-popup',
          'media-popup-safe-area',
          'media-popup-transition',
          'media-popup-surface',
          'ap-popup',
          'ap-volume-popup'
        )}
        {...popup.popupProps}
      >
        <VolumeSlider orientation="horizontal" className={'ap-volume-slider'} />
      </VolumePopoverPrimitive.Popup>
    </VolumePopoverPrimitive.Root>
  );
}

function SeekChip({ seconds }: { seconds: number }) {
  const back = seconds < 0;
  const word = back ? `back ${Math.abs(seconds)}s` : `ahead ${seconds}s`;
  return (
    <SeekButtonPrimitive
      className={'ap-chip'}
      data-tone="paper"
      seconds={seconds}
      aria-label={back ? `back ${Math.abs(seconds)} seconds` : `ahead ${seconds} seconds`}
    >
      {word}
    </SeekButtonPrimitive>
  );
}
