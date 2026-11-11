// Foldable-phone awareness shared by all skins, after the Video.js post "Developing for iPhone Duo on the web":
// https://videojs.org/blog/iphone-duo-web-development
//
// On a real device it reads the Device Posture API (navigator.devicePosture: 'continuous' | 'folded') and the
// Viewport Segments API (window.viewport.segments: one DOMRect per side of the fold). Inside the site's Duo
// simulation, <SimulatedFoldable> supplies the same values instead, so a skin has one code path for both.
//
// A skin calls useFoldable(ref), with a ref to any element inside its player, and spreads foldableAttributes(state) onto its container. CSS then keys on:
//   data-posture="continuous|folded"   data-split="none|vertical|horizontal"   data-display="inner|outer-p|outer-l"
//   --seg0-top / --seg0-height / --seg1-top / --seg1-height   (px, relative to the player)
// Split layouts only make sense when the player is the whole screen, so real-device values count only while the
// player is fullscreen (the blog applies its folded layout under :fullscreen too); the simulation stands in for that.
import { createContext, useContext, useEffect, useState, type CSSProperties, type RefObject } from 'react';

export type DevicePosture = 'continuous' | 'folded';
/** 'vertical' = two segments stacked top / bottom (vertical-viewport-segments: 2), 'horizontal' = side by side. */
export type FoldSplit = 'none' | 'vertical' | 'horizontal';
/** Which panel the player is on. Real devices can't tell the outer display apart, so it is always 'inner' there. */
export type FoldDisplay = 'inner' | 'outer-p' | 'outer-l';

export interface SegmentRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface FoldableState {
  posture: DevicePosture;
  split: FoldSplit;
  segments: SegmentRect[];
  display: FoldDisplay;
  /** Values come from the simulation rather than the device. */
  simulated: boolean;
  /** The player is fullscreen, so the viewport segments describe it. */
  fullscreen: boolean;
}

export type SimulatedFoldableValue = Pick<FoldableState, 'posture' | 'split' | 'segments' | 'display'>;

/** Provided by the Duo simulation; null on a real page. */
export const SimulatedFoldable = createContext<SimulatedFoldableValue | null>(null);

interface PostureLike extends EventTarget {
  type?: string;
}

function readDevice(): Omit<FoldableState, 'simulated' | 'fullscreen'> {
  const fallback = { posture: 'continuous' as const, split: 'none' as const, segments: [], display: 'inner' as const };
  if (typeof window === 'undefined') return fallback;
  const posture = (navigator as Navigator & { devicePosture?: PostureLike }).devicePosture;
  const rects = (window as Window & { viewport?: { segments?: DOMRect[] | null } }).viewport?.segments ?? null;
  const segments = (rects ?? []).map(({ top, left, width, height }) => ({ top, left, width, height }));
  let split: FoldSplit = 'none';
  if (segments.length === 2) split = Math.abs(segments[0].left - segments[1].left) < 1 ? 'vertical' : 'horizontal';
  return { ...fallback, posture: posture?.type === 'folded' ? 'folded' : 'continuous', split, segments };
}

export function useFoldable(ref: RefObject<HTMLElement | null>): FoldableState {
  const simulated = useContext(SimulatedFoldable);
  const [device, setDevice] = useState(readDevice);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const update = () => setDevice(readDevice());
    const posture = (navigator as Navigator & { devicePosture?: PostureLike }).devicePosture;
    const onFullscreen = () => {
      const element = document.fullscreenElement ?? (document as Document & { webkitFullscreenElement?: Element })
        .webkitFullscreenElement;
      setFullscreen(Boolean(ref.current && element?.contains(ref.current)));
      update();
    };
    posture?.addEventListener?.('change', update);
    window.addEventListener('resize', update);
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('webkitfullscreenchange', onFullscreen);
    return () => {
      posture?.removeEventListener?.('change', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('webkitfullscreenchange', onFullscreen);
    };
  }, [ref]);

  // Fullscreen takes the player out of the simulated phone, so the real screen wins there.
  if (simulated && !fullscreen) return { ...simulated, simulated: true, fullscreen };
  return { ...device, simulated: false, fullscreen };
}

/** Data attributes and segment variables for the skin's container. */
export function foldableAttributes(state: FoldableState) {
  const style: Record<string, string> = {};
  state.segments.slice(0, 2).forEach((segment, index) => {
    style[`--seg${index}-top`] = `${segment.top}px`;
    style[`--seg${index}-height`] = `${segment.height}px`;
    style[`--seg${index}-left`] = `${segment.left}px`;
    style[`--seg${index}-width`] = `${segment.width}px`;
  });
  return {
    'data-posture': state.posture,
    'data-split': state.split,
    'data-display': state.display,
    'data-simulated': state.simulated ? '' : undefined,
    style: style as CSSProperties,
  };
}
