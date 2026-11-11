/** @jsxImportSource react */

'use client';

import {
  CastButton as CastButtonPrimitive,
  FullscreenButton as FullscreenButtonPrimitive,
  Menu,
  PiPButton as PiPButtonPrimitive,
} from '@videojs/react';
import { usePlayer } from '@videojs/react/video';

import { AudioTrackMenu } from '../../ui/audio-track-menu';
import { CaptionsSubmenu } from '../../ui/captions-submenu';
import { PlaybackRateSubmenu } from '../../ui/playback-rate-submenu';
import { QualityMenu } from '../../ui/quality-menu';
import { cn } from '../../lib/resolve-class-name';

import { usePopupMode } from './popups';

/** Fullscreen run by the host page rather than the browser (see AnnotatedStage). */
export interface FullscreenControl {
  active: boolean;
  toggle: () => void;
}

/**
 * The extra controls, as footnotes under the sentence. They number themselves with a CSS counter, so a control the
 * browser can't offer (picture in picture, casting) simply drops out and the rest renumber. `compact` shows only the
 * numbers; the full words stay in each button's accessible name.
 */
export function Footnotes({
  compact = false,
  fullscreenControl,
}: {
  compact?: boolean;
  fullscreenControl?: FullscreenControl | null | undefined;
}) {
  const browserFs = usePlayer((s) => s.isFullscreen) ?? false;
  const fs = browserFs || !!fullscreenControl?.active;
  const pip = usePlayer((s) => s.isPictureInPicture) ?? false;
  const casting = usePlayer((s) => s.remotePlaybackState) === 'connected';

  const fsLabel = fs ? 'Exit full screen' : 'Full screen';
  const pipLabel = pip ? 'Exit picture in picture' : 'Picture in picture';
  const castLabel = casting ? 'Stop casting' : 'Cast to a screen';
  const settings = usePopupMode();

  return (
    <aside className={'ap-footnotes'} data-compact={compact || undefined} aria-label="More controls">
      {fullscreenControl ? (
        <button type="button" className={'ap-fn'} aria-label={fsLabel} onClick={fullscreenControl.toggle}>
          <span className={'ap-fn-label'}>{fsLabel}</span>
        </button>
      ) : (
        <FullscreenButtonPrimitive className={'ap-fn'} aria-label={fsLabel}>
          <span className={'ap-fn-label'}>{fsLabel}</span>
        </FullscreenButtonPrimitive>
      )}
      <PiPButtonPrimitive className={'ap-fn'} aria-label={pipLabel}>
        <span className={'ap-fn-label'}>{pipLabel}</span>
      </PiPButtonPrimitive>
      <Menu.Root
        side="top"
        align={compact ? 'end' : 'start'}
        open={settings.open}
        onOpenChange={(open) => settings.setOpen(open)}
      >
        <Menu.Trigger render={<button type="button" />} className={'ap-fn'} aria-label="Settings: quality, audio, speed and captions">
          <span className={'ap-fn-label'}>Settings — quality, audio</span>
        </Menu.Trigger>
        <Menu.Popup
          keepMounted
          className={cn('media-popup', 'media-popup-surface', 'media-menu-popup', 'media-menu-resizable-popup', 'ap-popup')}
          {...settings.popupProps}
        >
          <Menu.Content className={'media-menu-content'}>
            <QualityMenu />
            <AudioTrackMenu />
            <PlaybackRateSubmenu />
            <CaptionsSubmenu />
          </Menu.Content>
        </Menu.Popup>
      </Menu.Root>
      <CastButtonPrimitive className={'ap-fn'} aria-label={castLabel}>
        <span className={'ap-fn-label'}>{castLabel}</span>
      </CastButtonPrimitive>
    </aside>
  );
}
