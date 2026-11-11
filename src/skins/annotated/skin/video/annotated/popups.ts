'use client';

import { createContext, useContext, useEffect, useState } from 'react';

/**
 * When true, the skin's popups (chapter list, volume, settings) open as ordinary parts of the page instead of in the
 * browser's top layer. The Duo turns this on in its tabletop pose, so the popups lie on the bottom half and tilt with
 * it, like everything else drawn on the screen; the top layer would float them flat above the 3D scene.
 */
export const InlinePopups = createContext(false);

/**
 * Open state for one popup, plus the props that keep it out of the top layer when popups are inline. A popup can't
 * move between the top layer and the page while open, so it closes whenever the mode changes.
 */
export function usePopupMode() {
  const inline = useContext(InlinePopups);
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [inline]);
  const popupProps = inline ? ({ popover: undefined, 'data-on-page': '' } as const) : {};
  return { inline, open, setOpen, popupProps };
}
