/** @jsxImportSource react */

import { Tooltip } from '@videojs/react';
import type { ClassValue } from 'cn';
import type { ReactElement, ReactNode } from 'react';

import { cn } from '../../lib/resolve-class-name';

import { SketchSurface } from '../sketch/drawing';

export function ButtonTooltip({
  children,
  delay,
  disabled,
  label,
  popupClassName,
  sticky,
}: {
  children: ReactElement;
  delay?: number;
  disabled?: boolean;
  label?: ReactNode;
  popupClassName?: ClassValue;
  sticky?: boolean;
}) {
  return (
    <Tooltip.Root delay={delay} disabled={disabled} side="top" sticky={sticky}>
      <Tooltip.Trigger render={children} />
      <Tooltip.Popup className={cn('media-popup', 'media-popup-safe-area', 'media-tooltip-popup', popupClassName)}>
        <SketchSurface />
        {label ?? <Tooltip.Label />}
        {!label && <Tooltip.Shortcut className={'media-tooltip-shortcut'} />}
      </Tooltip.Popup>
    </Tooltip.Root>
  );
}
