/** @jsxImportSource react */

'use client';

import { Time } from '@videojs/react';
import { usePlayer } from '@videojs/react/video';
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

import { BufferingIndicator } from '../../ui/buffering-indicator';
import { ErrorDialog } from '../../ui/error-dialog';
import { Poster } from '../../ui/poster';
import { Title } from '../../ui/title';

import { VideoStatusIndicators } from '../display/status-indicators';
import { formatTime, useChapterNav, useChapters } from './chapters';
import { Footnotes, type FullscreenControl } from './footnotes';
import { InlinePopups } from './popups';
import { Sentence } from './sentence';
import { Timeline, type RenderThumbnail } from './timeline';

export interface AnnotatedStageProps {
  children?: ReactNode;
  renderPoster?: NonNullable<ComponentProps<typeof Poster>>['renderImage'];
  renderThumbnail?: RenderThumbnail;
  /** The small line above the title. Defaults to "Film · <duration>". */
  kicker?: ReactNode;
  /** The handwritten note in the right page's margin. Pass null to leave the margin empty. */
  marginNote?: ReactNode;
  /**
   * Fullscreen handled by the host instead of the browser (the Duo simulation plays fullscreen out on its drawn
   * phone). When set, the fullscreen footnote and double-click use it, and `active` switches the layout.
   */
  fullscreenControl?: FullscreenControl | null | undefined;
  /** Extra pieces laid over the stage (the Duo's edge rail, its library card). */
  extras?: ReactNode;
  /** The film's title, when the player doesn't carry one (defaults to the Video.js title). */
  title?: string | undefined;
  /** Open the popups as part of the page rather than in the top layer (see ./popups). */
  inlinePopups?: boolean | undefined;
  /**
   * Treat every pointer as a finger (the Duo is a phone). The controls then come back with a tap rather than a hover:
   * in fullscreen, a tap on the hidden film only wakes them, and the footnotes rest whenever the controls do.
   */
  touch?: boolean | undefined;
}

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))
  );
}

export function AnnotatedStage({
  children,
  renderPoster,
  renderThumbnail,
  kicker,
  marginNote,
  fullscreenControl,
  extras,
  title,
  inlinePopups = false,
  touch = false,
}: AnnotatedStageProps) {
  const store = usePlayer();
  const browserFullscreen = usePlayer((s) => s.isFullscreen) ?? false;
  const isFullscreen = browserFullscreen || !!fullscreenControl?.active;
  const controlsVisible = usePlayer((s) => s.controlsVisible) ?? true;
  const state = useChapters();
  const nav = useChapterNav(state);
  const { paused, time, duration } = state;
  const cue = state.index >= 0 ? state.cues[state.index] : undefined;
  const hasChapters = state.cues.length > 0;

  // Screen readers hear about chapter changes; the Video.js status announcer covers play, pause and seeking.
  const [announcement, setAnnouncement] = useState('');
  const firstIndex = useRef(true);
  useEffect(() => {
    if (firstIndex.current) {
      firstIndex.current = false;
      return;
    }
    if (cue) setAnnouncement(`Chapter ${state.index + 1} of ${state.cues.length}: ${cue.text}`);
    // Only the index matters; the cue list changing on its own isn't a chapter change.
  }, [state.index]);

  // Clicking the film plays or pauses it; double-clicking toggles fullscreen. On touch in fullscreen, a tap while
  // the controls are hidden brings them back first. Whether they were hidden is read on the way down, because the
  // player wakes its controls as the finger lifts, before the click arrives.
  const wokeOnTap = useRef(false);
  const onScreenPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    wokeOnTap.current = isFullscreen && !controlsVisible && (touch || event.pointerType === 'touch');
  };
  const onScreenClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('button, [role="dialog"], [role="menu"]')) return;
    if (wokeOnTap.current) {
      wokeOnTap.current = false;
      store.toggleControls(true);
      return;
    }
    if (paused) void store.play();
    else store.pause();
  };
  const onScreenDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('button, [role="dialog"]')) return;
    if (fullscreenControl) fullscreenControl.toggle();
    else if (isFullscreen) void store.exitFullscreen();
    else void store.requestFullscreen();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || isEditable(event.target)) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if ((event.target as Element).closest?.('[role="menu"], [role="dialog"]')) return;
    if (event.code === 'BracketLeft' && hasChapters) {
      event.preventDefault();
      nav.prev();
    } else if (event.code === 'BracketRight' && hasChapters) {
      event.preventDefault();
      nav.next();
    }
  };

  const pageTurnedAway = isFullscreen && !paused;
  const progress = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;

  return (
    <InlinePopups.Provider value={inlinePopups}>
    <div
      className={'ap-stage'}
      data-layout={isFullscreen ? 'fullscreen' : 'spread'}
      data-paused={paused || undefined}
      data-touch={touch || undefined}
      data-awake={controlsVisible || undefined}
      onKeyDown={onKeyDown}
    >
      {/* Left page: the film as a figure. */}
      <article className={'ap-page ap-page--left'} aria-label="Film">
        {!isFullscreen ? (
          <header className={'ap-head'}>
            <span className={'ap-kicker'}>
              {kicker ?? (
                <>
                  Film · <Time.Value type="duration" className={'ap-num'} />
                </>
              )}
            </span>
            {title ? <h2 className={'ap-title'}>{title}</h2> : <Title render={<h2 />} className={'ap-title'} />}
          </header>
        ) : null}

        <figure className={'ap-figure'}>
          <div
            className={'ap-screen'}
            onPointerDown={onScreenPointerDown}
            onClick={onScreenClick}
            onDoubleClick={onScreenDoubleClick}
          >
            {children}
            <Poster renderImage={renderPoster} />
            <BufferingIndicator />
            <ErrorDialog />
            <VideoStatusIndicators />
            <span className={'ap-pilcrow'} aria-hidden="true">
              ¶ paused
            </span>
          </div>
          <figcaption className={'ap-figcaption'}>
            <span className={'ap-fig'}>Fig. {formatTime(time)}</span>
            {cue ? cue.text : (title ?? <Title className={'ap-figcaption-title'} />)}
          </figcaption>
        </figure>

        {!isFullscreen ? <Timeline renderThumbnail={renderThumbnail} /> : null}
        {!isFullscreen ? (
          <span className={'ap-folio'} aria-hidden="true">
            56
          </span>
        ) : null}
      </article>

      {/* Right page: the controls, written out. In fullscreen it turns in over the film while paused. */}
      <article className={'ap-page ap-page--right'} aria-label="Player controls" inert={pageTurnedAway || undefined}>
        {isFullscreen ? (
          title ? (
            <h2 className={'ap-title ap-title--panel'}>{title}</h2>
          ) : (
            <Title render={<h2 />} className={'ap-title ap-title--panel'} />
          )
        ) : null}
        <Sentence />
        {isFullscreen ? <Timeline renderThumbnail={renderThumbnail} /> : null}
        {marginNote !== null ? (
          <p className={'ap-margin-note'}>{marginNote ?? '↖ the notes wake up when you pause'}</p>
        ) : null}
        <Footnotes fullscreenControl={fullscreenControl} />
        <span className={'ap-folio'} aria-hidden="true">
          57
        </span>
      </article>

      {/* Fullscreen while playing: a paper strip that comes and goes with the controls, then a hairline. */}
      {pageTurnedAway ? (
        <div className={'ap-strip'} role="group" aria-label="Player controls" data-visible={controlsVisible || undefined}>
          <Timeline renderThumbnail={renderThumbnail} className={'ap-timeline--strip'} />
          <div className={'ap-strip-row'}>
            <Sentence compact />
            <Footnotes compact fullscreenControl={fullscreenControl} />
          </div>
        </div>
      ) : null}
      {pageTurnedAway ? (
        <div className={'ap-hairline'} aria-hidden="true" data-visible={!controlsVisible || undefined}>
          <span style={{ inlineSize: `${progress}%` }} />
        </div>
      ) : null}

      {extras}

      <p className={'ap-sr'} aria-live="polite">
        {announcement}
      </p>
    </div>
    </InlinePopups.Provider>
  );
}
