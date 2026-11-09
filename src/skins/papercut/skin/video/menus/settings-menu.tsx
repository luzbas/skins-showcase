/** @jsxImportSource react */

import type { ComponentProps } from 'react';

import { AudioTrackMenu } from '../../ui/audio-track-menu';
import { CaptionsSubmenu } from '../../ui/captions-submenu';
import { PlaybackRateSubmenu } from '../../ui/playback-rate-submenu';
import { QualityMenu } from '../../ui/quality-menu';
import { SettingsMenu } from '../../ui/settings-menu';

export type VideoSettingsMenuProps = Omit<NonNullable<ComponentProps<typeof SettingsMenu>>, 'children'>;

export function VideoSettingsMenu(props: VideoSettingsMenuProps = {}) {
  return (
    <SettingsMenu {...props}>
      <QualityMenu />
      <AudioTrackMenu />
      <PlaybackRateSubmenu />
      <CaptionsSubmenu />
    </SettingsMenu>
  );
}
