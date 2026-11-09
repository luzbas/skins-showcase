/** @jsxImportSource react */

'use client';

import { useTranslator } from '@videojs/react';

import { PlayButton } from '../../ui/play-button';
import { SeekButton } from '../../ui/seek-button';

/**
 * The terminal "stage" in the middle of the video: a bracketed `[ ▶ RUN ]` prompt whenever the video is paused
 * (before it starts, paused, or ended), `<< 10` and `10 >>` skip keys either side of it while paused, and an
 * `> EOF_` line when it ends. Visibility comes from the play button's own `data-paused` and `data-ended`
 * attributes, styled in `ascii.css`.
 *
 * The big play button is a shortcut for pointer and touch users only: the control bar's play button stays the one in
 * the tab order and the accessibility tree. The skip buttons are real controls (they only live here), so they are
 * focusable and labelled while shown, and hidden from both while playing; the arrow keys still skip then.
 */
export function AsciiStage() {
  const t = useTranslator();

  return (
    <div className={'ax-stage'}>
      <p className={'ax-end-banner'} aria-hidden="true">
        <span className={'ax-prompt'}>&gt;</span> {t('ascii.endOfFile', { default: 'EOF' })}
        <span className={'ax-cursor'}>_</span>
      </p>
      <div className={'ax-stage-row'}>
        <SeekButton className={'ax-stage-seek'} seconds={-10} />
        <PlayButton className={'ax-big-play'} tabIndex={-1} aria-hidden="true" />
        <SeekButton className={'ax-stage-seek'} seconds={10} />
      </div>
    </div>
  );
}
