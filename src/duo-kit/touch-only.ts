// The Duo is a phone, so every Duo skin is touch-only in every pose, even when the simulator is driven with a mouse.
// A skin calls useTouchOnly(getHost) with its player container and sets data-input="touch" on it. Then:
//   - hovering does nothing: hover-only mouse events (moving, entering, leaving with no button held) are caught on
//     their way down and go no further, so the controls don't wake when the mouse passes over, menus don't highlight
//     rows under it, and nothing opens on hover;
//   - :hover styles don't apply inside it: every stylesheet rule with :hover gets
//     :not([data-input="touch"], [data-input="touch"] *) added after it, once, in the browser (web skins elsewhere
//     on the page keep their hovers);
//   - with pressAsTouch, a mouse press counts as a finger: Video.js reads pointerType on pointerdown/up/move, so
//     those events are relabelled 'touch' and the player answers the way it does on a phone (a tap on the picture
//     shows or hides the controls, touch gestures fire, mouse-only gestures don't).
// Clicks, drags and real touch otherwise pass through untouched.
import { useEffect } from 'react';

// Hover-only mouse events: moving, entering and leaving with no button held. A finger can't do any of these.
const HOVER_EVENTS = [
  'pointermove',
  'pointerover',
  'pointerout',
  'pointerenter',
  'pointerleave',
  'mousemove',
  'mouseover',
  'mouseout',
  'mouseenter',
  'mouseleave',
] as const;

// The pointer events Video.js reads pointerType from on a press.
const PRESS_EVENTS = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'] as const;

export interface TouchOnlyOptions {
  /** Relabel mouse presses as touches, so the player behaves exactly as it does under a finger. */
  pressAsTouch?: boolean;
}

export function useTouchOnly(getElement: () => HTMLElement | null | undefined, { pressAsTouch = false }: TouchOnlyOptions = {}) {
  useEffect(() => {
    const el = getElement();
    if (!el) return;
    installHoverGuard();
    const swallow = (event: Event) => {
      const mouse = event as MouseEvent;
      if (mouse.buttons !== 0) return;
      if ('pointerType' in event && (event as PointerEvent).pointerType !== 'mouse') return;
      event.stopPropagation();
    };
    const asFinger = (event: Event) => {
      const pointer = event as PointerEvent;
      if (pointer.pointerType !== 'mouse') return;
      // A move with no button held is a hover, already stopped above.
      if (pointer.type === 'pointermove' && pointer.buttons === 0) return;
      Object.defineProperty(pointer, 'pointerType', { value: 'touch', configurable: true });
    };
    for (const type of HOVER_EVENTS) el.addEventListener(type, swallow, { capture: true });
    if (pressAsTouch) for (const type of PRESS_EVENTS) el.addEventListener(type, asFinger, { capture: true });
    return () => {
      for (const type of HOVER_EVENTS) el.removeEventListener(type, swallow, { capture: true });
      if (pressAsTouch) for (const type of PRESS_EVENTS) el.removeEventListener(type, asFinger, { capture: true });
    };
  }, [getElement, pressAsTouch]);
}

// ---------- :hover off inside touch-only players ----------

const NOT_TOUCH = ':not([data-input="touch"], [data-input="touch"] *)';
const HOVER = /:hover(?![\w-])/g;
const patchedSheets = new WeakSet<CSSStyleSheet>();
let installed = false;

function patchRules(rules: CSSRuleList) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule && rule.selectorText.includes(':hover')) {
      rule.selectorText = rule.selectorText.replace(HOVER, `:hover${NOT_TOUCH}`);
    }
    // Grouping rules (@media, @layer, @supports) and nested style rules.
    const nested = (rule as CSSGroupingRule).cssRules;
    if (nested && nested.length) patchRules(nested);
  }
}

function patchAll() {
  for (const sheet of Array.from(document.styleSheets)) {
    if (patchedSheets.has(sheet)) continue;
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // Cross-origin: not ours to read, and not ours to change.
    }
    patchedSheets.add(sheet);
    patchRules(rules);
  }
}

/** Patches every stylesheet once, then any that arrive later (lazy routes, link loads, dev hot reloads). */
function installHoverGuard() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  patchAll();
  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      patchAll();
    });
  };
  new MutationObserver(queue).observe(document.head, { childList: true, subtree: true, characterData: true });
  document.addEventListener('load', (event) => {
    if (event.target instanceof HTMLLinkElement) queue();
  }, true);
}
