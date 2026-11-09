/** @jsxImportSource react */

'use client';

import { useTranslator } from '@videojs/react';

import { PlayButton } from '../../ui/play-button';
import { SeekButton } from '../../ui/seek-button';

/**
 * The papercut "stage" in the middle of the video: a big paper play button whenever the video is paused (before it
 * starts, paused, or ended), skip back and forward buttons either side of it while paused, and a "The End" banner
 * when it ends. Visibility comes from the play button's own `data-paused` and `data-ended` attributes, styled in
 * `papercut.css`.
 *
 * The big play button is a shortcut for pointer and touch users only: the control bar's play button stays the one in
 * the tab order and the accessibility tree. The skip buttons are real controls (they only live here), so they are
 * focusable and labelled while shown, and hidden from both while playing; the arrow keys still skip then.
 */
export function PaperStage() {
  const t = useTranslator();

  return (
    <div className={'pc-stage'}>
      <p className={'pc-end-banner'} aria-hidden="true">
        {t('papercut.theEnd', { default: 'The End' })}
      </p>
      <div className={'pc-stage-row'}>
        <SeekButton className={'pc-stage-seek'} seconds={-10} />
        <PlayButton className={'pc-big-play'} tabIndex={-1} aria-hidden="true" />
        <SeekButton className={'pc-stage-seek'} seconds={10} />
      </div>
    </div>
  );
}
