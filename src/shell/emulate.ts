// Device emulation for the "How it will look" frames. Loaded before the app so the player sees it from the start.
//
// `?device=` frames get a fullscreen that stays inside the frame: requesting fullscreen marks the element with
// [data-sim-fullscreen], every `:fullscreen` rule in the page also matches that attribute, and the player's store reads
// it through document.fullscreenElement. Real fullscreen would take over the whole browser window instead.
// `&touch` frames also answer pointer and hover media queries (in CSS and matchMedia) the way a phone does.

const params = new URLSearchParams(window.location.search);
export const DEVICE = params.has('frame') ? params.get('device') : null;
export const TOUCH = DEVICE !== null && params.has('touch');
export const START_FULLSCREEN = DEVICE !== null && params.has('fs');

const ATTR = 'data-sim-fullscreen';
const ALWAYS = '(min-width: 0px)';
const NEVER = '(max-width: -1px)';

function swapMedia(text: string) {
  return text
    .replace(/\(\s*(any-)?pointer\s*:\s*coarse\s*\)/g, ALWAYS)
    .replace(/\(\s*(any-)?pointer\s*:\s*fine\s*\)/g, NEVER)
    .replace(/\(\s*(any-)?hover\s*:\s*none\s*\)/g, ALWAYS)
    .replace(/\(\s*(any-)?hover\s*:\s*hover\s*\)/g, NEVER);
}

function rewrite(rules: CSSRuleList) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule && rule.selectorText.includes(':fullscreen') && !rule.selectorText.includes(ATTR)) {
      rule.selectorText = rule.selectorText.replace(/:fullscreen(?![\w-])/g, `:is(:fullscreen, [${ATTR}])`);
    }
    if (TOUCH && rule instanceof CSSMediaRule) {
      const next = swapMedia(rule.media.mediaText);
      if (next !== rule.media.mediaText) rule.media.mediaText = next;
    }
    const nested = (rule as CSSGroupingRule).cssRules;
    if (nested) rewrite(nested);
  }
}

const done = new WeakSet<CSSStyleSheet>();
function rewriteSheets() {
  for (const sheet of Array.from(document.styleSheets)) {
    if (done.has(sheet)) continue;
    try {
      rewrite(sheet.cssRules);
      done.add(sheet);
    } catch {
      /* not loaded yet, or from another origin */
    }
  }
}

function install() {
  // ---- Fullscreen kept inside the frame ----
  let current: Element | null = null;
  const set = (el: Element | null) => {
    if (el === current) return;
    const previous = current;
    previous?.removeAttribute(ATTR);
    current = el;
    el?.setAttribute(ATTR, '');
    document.documentElement.toggleAttribute('data-sim-fs-active', !!el);
    (el ?? previous ?? document).dispatchEvent(new Event('fullscreenchange', { bubbles: true }));
  };
  const docProto = Document.prototype as unknown as Record<string, unknown>;
  for (const key of ['fullscreenElement', 'webkitFullscreenElement']) {
    Object.defineProperty(docProto, key, { configurable: true, get: () => current });
  }
  for (const key of ['fullscreenEnabled', 'webkitFullscreenEnabled']) {
    Object.defineProperty(docProto, key, { configurable: true, get: () => true });
  }
  const enter = function (this: Element) {
    set(this);
    return Promise.resolve();
  };
  const leave = () => {
    set(null);
    return Promise.resolve();
  };
  const elProto = Element.prototype as unknown as Record<string, unknown>;
  elProto.requestFullscreen = enter;
  elProto.webkitRequestFullscreen = enter;
  docProto.exitFullscreen = leave;
  docProto.webkitExitFullscreen = leave;
  // A fullscreen element taken out of the page ends fullscreen, as it does in a real browser.
  window.setInterval(() => {
    if (current && !current.isConnected) set(null);
  }, 500);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && current) set(null);
  });

  // The frame can't turn; pretend the lock worked.
  const orientation = screen.orientation as ScreenOrientation & { lock?: unknown } | undefined;
  if (orientation) {
    try {
      Object.defineProperty(orientation, 'lock', { configurable: true, value: () => Promise.resolve() });
      Object.defineProperty(orientation, 'unlock', { configurable: true, value: () => {} });
    } catch {
      /* read-only here */
    }
  }

  // ---- Phone pointer ----
  if (TOUCH) {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => original(swapMedia(query));
    document.documentElement.setAttribute('data-sim-touch', '');
  }

  // ---- Stylesheets, including ones added later ----
  const style = document.createElement('style');
  style.textContent = `
    [${ATTR}] {
      position: fixed !important; inset: 0 !important; box-sizing: border-box;
      width: 100% !important; height: 100% !important; min-width: 0 !important; max-width: none !important;
      max-height: none !important; margin: 0 !important; transform: none !important; z-index: 2147483647 !important;
    }
    html[data-sim-fs-active], html[data-sim-fs-active] body { background: #000 !important; overflow: hidden !important; }
    html[data-sim-fs-active] .shell-device-frame-inner { transform: none !important; }
  `;
  document.head.appendChild(style);

  rewriteSheets();
  new MutationObserver(() => rewriteSheets()).observe(document.head, { childList: true, subtree: true, characterData: true });
  document.addEventListener('load', () => rewriteSheets(), true);
}

if (DEVICE !== null) install();
