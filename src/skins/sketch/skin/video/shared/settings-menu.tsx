/** @jsxImportSource react */
import { audioText, captionsText, qualityText, settingsText, speedText } from '@videojs/core/i18n/text/menu';
import { Text as TextPrimitive } from '@videojs/react';
import { CaptionsButton as CaptionsButtonPrimitive, Menu } from '@videojs/react';
import type { ReactNode } from 'react';
import {
  ChevronIcon as ChevronIconPrimitive,
  SwitchesIcon as SwitchesIconPrimitive,
  SpeechIcon as SpeechIconPrimitive,
  SpeedIcon as SpeedIconPrimitive,
  CaptionsOffIcon as CaptionsOffIconPrimitive,
  GearIcon as GearIconPrimitive,
} from '../icons';
import { AudioTrackRadioGroup } from '@videojs/react/ui/audio-track-radio-group';
import { CaptionsRadioGroup } from '@videojs/react/ui/captions-radio-group';
import { PlaybackRateRadioGroup } from '@videojs/react/ui/playback-rate-radio-group';
import { QualityRadioGroup } from '@videojs/react/ui/quality-radio-group';

import { cn } from '../../lib/resolve-class-name';

import { SketchLead, SketchMark, SketchSurface } from '../sketch/drawing';

import { Button } from './button';
import { RadioItem } from './menu-item';
import { ButtonTooltip } from './tooltip';

function MenuChevron({ back = false }: { back?: boolean } = {}) {
  return <ChevronIconPrimitive className={back ? 'media-menu-back-chevron' : 'media-menu-forward-chevron'} />;
}

export function QualityMenu() {
  return (
    <Menu.Root>
      <QualityRadioGroup.Root>
        <Menu.Trigger className={'media-menu-item'}>
          <SketchMark />
          <SwitchesIconPrimitive className={'media-menu-trigger-icon'} />
          <TextPrimitive token={qualityText.key}>{qualityText.text}</TextPrimitive>
          <span className={'media-menu-hint'}>
            <QualityRadioGroup.Value className={'media-menu-hint-label'} />
            <MenuChevron />
          </span>
        </Menu.Trigger>
        <Menu.Content className={'media-menu-content'}>
          <Menu.Item className={'media-menu-back-item'}>
            <SketchMark />
            <MenuChevron back />
            <TextPrimitive token={qualityText.key}>{qualityText.text}</TextPrimitive>
          </Menu.Item>
          <Menu.Separator className={'media-menu-separator'} />
          <QualityRadioGroup.Options
            className={'media-menu-radio-group'}
            renderItem={(props, item) => (
              <RadioItem {...props}>
                <span>
                  <span>{item.label}</span>
                  {item.tier ? <sup className={'media-menu-tier'}>{item.tier}</sup> : null}
                </span>
                {item.badge ? <span className={'media-menu-badge'}>{item.badge}</span> : null}
              </RadioItem>
            )}
          ></QualityRadioGroup.Options>
        </Menu.Content>
      </QualityRadioGroup.Root>
    </Menu.Root>
  );
}

export function AudioTrackMenu() {
  return (
    <Menu.Root>
      <AudioTrackRadioGroup.Root>
        <Menu.Trigger className={'media-menu-item'}>
          <SketchMark />
          <SpeechIconPrimitive className={'media-menu-trigger-icon'} />
          <TextPrimitive token={audioText.key}>{audioText.text}</TextPrimitive>
          <span className={'media-menu-hint'}>
            <AudioTrackRadioGroup.Value className={'media-menu-hint-label'} />
            <MenuChevron />
          </span>
        </Menu.Trigger>
        <Menu.Content className={'media-menu-content'}>
          <Menu.Item className={'media-menu-back-item'}>
            <SketchMark />
            <MenuChevron back />
            <TextPrimitive token={audioText.key}>{audioText.text}</TextPrimitive>
          </Menu.Item>
          <Menu.Separator className={'media-menu-separator'} />
          <AudioTrackRadioGroup.Options
            className={'media-menu-radio-group'}
            renderItem={(props, item) => (
              <RadioItem {...props}>
                <span>{item.label}</span>
              </RadioItem>
            )}
          ></AudioTrackRadioGroup.Options>
        </Menu.Content>
      </AudioTrackRadioGroup.Root>
    </Menu.Root>
  );
}

export function PlaybackRateMenu() {
  return (
    <Menu.Root>
      <PlaybackRateRadioGroup.Root>
        <Menu.Trigger className={'media-menu-item'}>
          <SketchMark />
          <SpeedIconPrimitive className={'media-menu-trigger-icon'} />
          <TextPrimitive token={speedText.key}>{speedText.text}</TextPrimitive>
          <span className={'media-menu-hint'}>
            <PlaybackRateRadioGroup.Value className={'media-menu-hint-label'} />
            <MenuChevron />
          </span>
        </Menu.Trigger>
        <Menu.Content className={'media-menu-content'}>
          <Menu.Item className={'media-menu-back-item'}>
            <SketchMark />
            <MenuChevron back />
            <TextPrimitive token={speedText.key}>{speedText.text}</TextPrimitive>
          </Menu.Item>
          <Menu.Separator className={'media-menu-separator'} />
          <PlaybackRateRadioGroup.Options
            className={'media-menu-radio-group'}
            renderItem={(props, item) => (
              <RadioItem {...props}>
                <span>{item.label}</span>
              </RadioItem>
            )}
          ></PlaybackRateRadioGroup.Options>
        </Menu.Content>
      </PlaybackRateRadioGroup.Root>
    </Menu.Root>
  );
}

export function CaptionsMenu() {
  return (
    <Menu.Root>
      <CaptionsRadioGroup.Root>
        <Menu.Trigger className={'media-menu-item'}>
          <SketchMark />
          <CaptionsOffIconPrimitive className={'media-menu-trigger-icon'} />
          <TextPrimitive token={captionsText.key}>{captionsText.text}</TextPrimitive>
          <span className={'media-menu-hint'}>
            <CaptionsRadioGroup.Value className={'media-menu-hint-label'} />
            <MenuChevron />
          </span>
        </Menu.Trigger>
        <Menu.Content className={'media-menu-content'}>
          <Menu.Item className={'media-menu-back-item'}>
            <SketchMark />
            <MenuChevron back />
            <TextPrimitive token={captionsText.key}>{captionsText.text}</TextPrimitive>
          </Menu.Item>
          <Menu.Separator className={'media-menu-separator'} />
          <CaptionsRadioGroup.Options
            className={'media-menu-radio-group'}
            renderItem={(props, item) => (
              <RadioItem {...props}>
                <span>{item.label}</span>
              </RadioItem>
            )}
          ></CaptionsRadioGroup.Options>
        </Menu.Content>
      </CaptionsRadioGroup.Root>
    </Menu.Root>
  );
}

/**
 * `side` is where the menu opens. The board's settings chip opens it to the left, over the video, where it always
 * fits: a menu that fits neither above nor below flips between them forever.
 */
export function SettingsMenu({
  chip = false,
  side = 'top',
  align = 'center',
}: { chip?: boolean; side?: 'top' | 'left'; align?: 'start' | 'center' | 'end' } = {}) {
  return (
    <Menu.Root side={side} align={align}>
      <ButtonTooltip label={<TextPrimitive token={settingsText.key}>{settingsText.text}</TextPrimitive>}>
        <Menu.Trigger render={<Button chip={chip} />} className={chip ? 'media-settings-chip' : undefined}>
          <GearIconPrimitive className={'media-button-icon'} />
          <TextPrimitive className={'media-settings-button-label'} token={settingsText.key}>
            {settingsText.text}
          </TextPrimitive>
        </Menu.Trigger>
      </ButtonTooltip>
      <Menu.Popup keepMounted className={cn('media-popup', 'media-popup-safe-area', 'media-menu-popup')}>
        <SketchSurface inset={2} draw seedKey={'settings-menu'} />
        <Menu.Content className={'media-menu-content'}>
          <QualityMenu />
          <AudioTrackMenu />
          <PlaybackRateMenu />
          <CaptionsMenu />
        </Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  );
}

type ChipPlacement = { side?: 'top' | 'left'; align?: 'start' | 'center' | 'end' };

/** One settings chip on the board: the trace from the video chip, then the chip itself. */
function SettingChip({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className={'sketch-ic'} data-setting={name}>
      <SketchLead className={'sketch-ic-lead'} dot="start" />
      {children}
    </div>
  );
}

function ChipPopup({ seedKey, children }: { seedKey: string; children: ReactNode }) {
  return (
    <Menu.Popup className={cn('media-popup', 'media-popup-safe-area', 'media-menu-popup')}>
      <SketchSurface inset={2} draw seedKey={seedKey} />
      <Menu.Content className={'media-menu-content'}>{children}</Menu.Content>
    </Menu.Popup>
  );
}

/** Playback speed as a chip: its value printed on it, its rates in a menu beside it. */
export function SpeedChip({ side = 'left', align = 'center' }: ChipPlacement) {
  return (
    <SettingChip name="speed">
      <Menu.Root side={side} align={align}>
        <PlaybackRateRadioGroup.Root>
          <Menu.Trigger render={<Button chip />} className={'sketch-ic-button'}>
            <span className={'sketch-ic-ref'} aria-hidden="true" />
            <TextPrimitive className={'sketch-ic-name'} token={speedText.key}>{speedText.text}</TextPrimitive>
            <PlaybackRateRadioGroup.Value className={'sketch-ic-value'} />
          </Menu.Trigger>
          <ChipPopup seedKey={'speed-menu'}>
            <PlaybackRateRadioGroup.Options
              className={'media-menu-radio-group'}
              renderItem={(props, item) => (
                <RadioItem {...props}>
                  <span>{item.label}</span>
                </RadioItem>
              )}
            ></PlaybackRateRadioGroup.Options>
          </ChipPopup>
        </PlaybackRateRadioGroup.Root>
      </Menu.Root>
    </SettingChip>
  );
}

export function QualityChip({ side = 'left', align = 'center' }: ChipPlacement) {
  return (
    <SettingChip name="quality">
      <Menu.Root side={side} align={align}>
        <QualityRadioGroup.Root>
          <Menu.Trigger render={<Button chip />} className={'sketch-ic-button'}>
            <span className={'sketch-ic-ref'} aria-hidden="true" />
            <TextPrimitive className={'sketch-ic-name'} token={qualityText.key}>{qualityText.text}</TextPrimitive>
            <QualityRadioGroup.Value className={'sketch-ic-value'} />
          </Menu.Trigger>
          <ChipPopup seedKey={'quality-menu'}>
            <QualityRadioGroup.Options
              className={'media-menu-radio-group'}
              renderItem={(props, item) => (
                <RadioItem {...props}>
                  <span>
                    <span>{item.label}</span>
                    {item.tier ? <sup className={'media-menu-tier'}>{item.tier}</sup> : null}
                  </span>
                  {item.badge ? <span className={'media-menu-badge'}>{item.badge}</span> : null}
                </RadioItem>
              )}
            ></QualityRadioGroup.Options>
          </ChipPopup>
        </QualityRadioGroup.Root>
      </Menu.Root>
    </SettingChip>
  );
}

export function AudioChip({ side = 'left', align = 'center' }: ChipPlacement) {
  return (
    <SettingChip name="audio">
      <Menu.Root side={side} align={align}>
        <AudioTrackRadioGroup.Root>
          <Menu.Trigger render={<Button chip />} className={'sketch-ic-button'}>
            <span className={'sketch-ic-ref'} aria-hidden="true" />
            <TextPrimitive className={'sketch-ic-name'} token={audioText.key}>{audioText.text}</TextPrimitive>
            <AudioTrackRadioGroup.Value className={'sketch-ic-value'} />
          </Menu.Trigger>
          <ChipPopup seedKey={'audio-menu'}>
            <AudioTrackRadioGroup.Options
              className={'media-menu-radio-group'}
              renderItem={(props, item) => (
                <RadioItem {...props}>
                  <span>{item.label}</span>
                </RadioItem>
              )}
            ></AudioTrackRadioGroup.Options>
          </ChipPopup>
        </AudioTrackRadioGroup.Root>
      </Menu.Root>
    </SettingChip>
  );
}

/** Captions as a chip that switches them on and off; it reads ON in red pencil while they show. */
export function CaptionsChip() {
  return (
    <SettingChip name="captions">
      <CaptionsButtonPrimitive render={<Button chip />} className={cn('media-captions-button', 'sketch-ic-button')}>
        <span className={'sketch-ic-ref'} aria-hidden="true" />
        <TextPrimitive className={'sketch-ic-name'} token={captionsText.key}>{captionsText.text}</TextPrimitive>
        <span className={'sketch-ic-value'} aria-hidden="true">
          <span className={'sketch-ic-on'}>ON</span>
          <span className={'sketch-ic-off'}>OFF</span>
        </span>
      </CaptionsButtonPrimitive>
    </SettingChip>
  );
}
