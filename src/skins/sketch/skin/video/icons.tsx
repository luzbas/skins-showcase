/** @jsxImportSource react */

/*
 * The sketch skin's icons, drawn by the pen in `sketch/pen.ts` from the geometry in
 * `sketch/icon-shapes.ts`. They boil with the control they sit in. The names match
 * `@videojs/react/icons/scaffold`, so components swap only the import.
 */

import { forwardRef, useContext, useMemo, type SVGProps } from 'react';

import { BoilContext } from './sketch/drawing';
import { ICON_SHAPES, type IconName, type IconShape } from './sketch/icon-shapes';
import { PENS, arrowhead, hatch, seedOf, stroke } from './sketch/pen';

type IconProps = SVGProps<SVGSVGElement>;

function draw(name: IconName, seed: number) {
  const shape: IconShape = ICON_SHAPES[name];
  let ink = '';
  shape.strokes.forEach((s, i) => {
    ink +=
      s.kind === 'arrow'
        ? arrowhead(s.tip, s.degrees, s.size, PENS.icon, seed + i * 2.3)
        : stroke(s.points, PENS.icon, seed + i * 2.3, s.closed);
  });
  const h = shape.hatch;
  const hatching = h ? hatch(h.box[0], h.box[1], h.box[2], h.box[3], h.gap, PENS.hatchIcon, seed + 40, h.keep) : '';
  return { ink, hatching };
}

function sketchIcon(displayName: string, name: IconName, spin = false) {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(props, ref) {
    const frame = useContext(BoilContext);
    const seed = seedOf(name) + (frame ? frame * 1.618 + 11 : 0);
    const { ink, hatching } = useMemo(() => draw(name, seed), [seed]);
    const paths = (
      <>
        <path d={ink} />
        {hatching && <path d={hatching} />}
      </>
    );

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={18}
        height={18}
        viewBox="0 0 18 18"
        fill="currentColor"
        aria-hidden="true"
        data-sketch-icon=""
        ref={ref}
        {...props}
      >
        {spin ? <g className={'media-sketch-spin'}>{paths}</g> : paths}
      </svg>
    );
  });
  Icon.displayName = displayName;
  return Icon;
}

export const PlayIcon = sketchIcon('PlayIcon', 'play');
export const PauseIcon = sketchIcon('PauseIcon', 'pause');
export const RestartIcon = sketchIcon('RestartIcon', 'restart');
export const SeekIcon = sketchIcon('SeekIcon', 'seek');
export const VolumeHighIcon = sketchIcon('VolumeHighIcon', 'volumeHigh');
export const VolumeLowIcon = sketchIcon('VolumeLowIcon', 'volumeLow');
export const VolumeOffIcon = sketchIcon('VolumeOffIcon', 'volumeOff');
export const CaptionsOffIcon = sketchIcon('CaptionsOffIcon', 'captionsOff');
export const CaptionsOnIcon = sketchIcon('CaptionsOnIcon', 'captionsOn');
export const FullscreenEnterIcon = sketchIcon('FullscreenEnterIcon', 'fullscreenEnter');
export const FullscreenExitIcon = sketchIcon('FullscreenExitIcon', 'fullscreenExit');
export const PipEnterIcon = sketchIcon('PipEnterIcon', 'pipEnter');
export const PipExitIcon = sketchIcon('PipExitIcon', 'pipExit');
export const CastEnterIcon = sketchIcon('CastEnterIcon', 'castEnter');
export const CastExitIcon = sketchIcon('CastExitIcon', 'castExit');
export const AirPlayEnterIcon = sketchIcon('AirPlayEnterIcon', 'airplayEnter');
export const AirPlayExitIcon = sketchIcon('AirPlayExitIcon', 'airplayExit');
export const CheckIcon = sketchIcon('CheckIcon', 'check');
export const ChevronIcon = sketchIcon('ChevronIcon', 'chevron');
export const GearIcon = sketchIcon('GearIcon', 'gear');
export const SwitchesIcon = sketchIcon('SwitchesIcon', 'switches');
export const SpeechIcon = sketchIcon('SpeechIcon', 'speech');
export const SpeedIcon = sketchIcon('SpeedIcon', 'speed');
export const SpinnerIcon = sketchIcon('SpinnerIcon', 'spinner', true);
