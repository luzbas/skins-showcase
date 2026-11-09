/** @jsxImportSource react */

/**
 * Clay icons: every control icon is a piece of dark modelling clay, rendered in Blender (`blender/clay_player.blend`,
 * scene "ClayAssets") to a transparent WebP in `../assets`. Same names and props as `@videojs/react/icons`, so the
 * skin's buttons import from here instead; icons this file doesn't redraw come through unchanged from Video.js.
 *
 * The thick set (`../assets/thick`) is the same clay, pressed about twice as thick and drawn with the camera tilted
 * so each piece shows its side wall; `ClayThicknessContext` picks the set.
 *
 * Each icon keeps the matching Video.js SVG inside it, hidden. It shows instead of the clay picture in forced-colors
 * (Windows High Contrast) mode, where it follows the system colours; see `.clay-icon-fallback` in `clay.css`.
 */
import { createContext, useContext } from 'react';
import type { ComponentType, SVGProps } from 'react';
import * as Base from '@videojs/react/icons';

import airplayEnter from '../assets/icon-airplay-enter.webp';
import airplayExit from '../assets/icon-airplay-exit.webp';
import captionsOff from '../assets/icon-captions-off.webp';
import captionsOn from '../assets/icon-captions-on.webp';
import castEnter from '../assets/icon-cast-enter.webp';
import castExit from '../assets/icon-cast-exit.webp';
import check from '../assets/icon-check.webp';
import chevron from '../assets/icon-chevron.webp';
import fullscreenEnter from '../assets/icon-fullscreen-enter.webp';
import fullscreenExit from '../assets/icon-fullscreen-exit.webp';
import gear from '../assets/icon-gear.webp';
import pause from '../assets/icon-pause.webp';
import pipEnter from '../assets/icon-pip-enter.webp';
import pipExit from '../assets/icon-pip-exit.webp';
import play from '../assets/icon-play.webp';
import restart from '../assets/icon-restart.webp';
import seek from '../assets/icon-seek.webp';
import speech from '../assets/icon-speech.webp';
import speed from '../assets/icon-speed.webp';
import switches from '../assets/icon-switches.webp';
import volumeHigh from '../assets/icon-volume-high.webp';
import volumeLow from '../assets/icon-volume-low.webp';
import volumeOff from '../assets/icon-volume-off.webp';

import airplayEnterThick from '../assets/thick/icon-airplay-enter.webp';
import airplayExitThick from '../assets/thick/icon-airplay-exit.webp';
import captionsOffThick from '../assets/thick/icon-captions-off.webp';
import captionsOnThick from '../assets/thick/icon-captions-on.webp';
import castEnterThick from '../assets/thick/icon-cast-enter.webp';
import castExitThick from '../assets/thick/icon-cast-exit.webp';
import checkThick from '../assets/thick/icon-check.webp';
import chevronThick from '../assets/thick/icon-chevron.webp';
import fullscreenEnterThick from '../assets/thick/icon-fullscreen-enter.webp';
import fullscreenExitThick from '../assets/thick/icon-fullscreen-exit.webp';
import gearThick from '../assets/thick/icon-gear.webp';
import pauseThick from '../assets/thick/icon-pause.webp';
import pipEnterThick from '../assets/thick/icon-pip-enter.webp';
import pipExitThick from '../assets/thick/icon-pip-exit.webp';
import playThick from '../assets/thick/icon-play.webp';
import restartThick from '../assets/thick/icon-restart.webp';
import seekThick from '../assets/thick/icon-seek.webp';
import speechThick from '../assets/thick/icon-speech.webp';
import speedThick from '../assets/thick/icon-speed.webp';
import switchesThick from '../assets/thick/icon-switches.webp';
import volumeHighThick from '../assets/thick/icon-volume-high.webp';
import volumeLowThick from '../assets/thick/icon-volume-low.webp';
import volumeOffThick from '../assets/thick/icon-volume-off.webp';

export * from '@videojs/react/icons';

type IconProps = SVGProps<SVGSVGElement>;

/** Which clay set to draw: the thin slabs, or the thick ones rendered with their side walls showing. */
export type ClayThickness = 'thin' | 'thick';
export const ClayThicknessContext = createContext<ClayThickness>('thin');

function clayIcon(thin: string, thick: string, Fallback: ComponentType<IconProps>) {
  return function ClayIcon({ className, style, ...props }: IconProps) {
    const src = useContext(ClayThicknessContext) === 'thick' ? thick : thin;
    return (
      <span className={['clay-icon', className].filter(Boolean).join(' ')} style={style} aria-hidden="true">
        <img className={'clay-icon-art'} src={src} alt="" draggable={false} decoding="async" />
        <Fallback className={'clay-icon-fallback'} aria-hidden="true" focusable="false" {...props} />
      </span>
    );
  };
}

export const PlayIcon = clayIcon(play, playThick, Base.PlayIcon);
export const PauseIcon = clayIcon(pause, pauseThick, Base.PauseIcon);
export const RestartIcon = clayIcon(restart, restartThick, Base.RestartIcon);
export const SeekIcon = clayIcon(seek, seekThick, Base.SeekIcon);
export const VolumeHighIcon = clayIcon(volumeHigh, volumeHighThick, Base.VolumeHighIcon);
export const VolumeLowIcon = clayIcon(volumeLow, volumeLowThick, Base.VolumeLowIcon);
export const VolumeOffIcon = clayIcon(volumeOff, volumeOffThick, Base.VolumeOffIcon);
export const CaptionsOnIcon = clayIcon(captionsOn, captionsOnThick, Base.CaptionsOnIcon);
export const CaptionsOffIcon = clayIcon(captionsOff, captionsOffThick, Base.CaptionsOffIcon);
export const GearIcon = clayIcon(gear, gearThick, Base.GearIcon);
export const FullscreenEnterIcon = clayIcon(fullscreenEnter, fullscreenEnterThick, Base.FullscreenEnterIcon);
export const FullscreenExitIcon = clayIcon(fullscreenExit, fullscreenExitThick, Base.FullscreenExitIcon);
export const PipEnterIcon = clayIcon(pipEnter, pipEnterThick, Base.PipEnterIcon);
export const PipExitIcon = clayIcon(pipExit, pipExitThick, Base.PipExitIcon);
export const CastEnterIcon = clayIcon(castEnter, castEnterThick, Base.CastEnterIcon);
export const CastExitIcon = clayIcon(castExit, castExitThick, Base.CastExitIcon);
export const AirPlayEnterIcon = clayIcon(airplayEnter, airplayEnterThick, Base.AirPlayEnterIcon);
export const AirPlayExitIcon = clayIcon(airplayExit, airplayExitThick, Base.AirPlayExitIcon);
export const ChevronIcon = clayIcon(chevron, chevronThick, Base.ChevronIcon);
export const CheckIcon = clayIcon(check, checkThick, Base.CheckIcon);
export const SpeedIcon = clayIcon(speed, speedThick, Base.SpeedIcon);
export const SwitchesIcon = clayIcon(switches, switchesThick, Base.SwitchesIcon);
export const SpeechIcon = clayIcon(speech, speechThick, Base.SpeechIcon);
export const QualityIcon = clayIcon(switches, switchesThick, Base.QualityIcon);
