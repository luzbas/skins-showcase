/** @jsxImportSource react */

import { ErrorDialog as ErrorDialogPrimitive } from '@videojs/react';

import { SketchSurface } from '../sketch/drawing';

import { Button } from './button';

export function ErrorDialog() {
  return (
    <ErrorDialogPrimitive.Root>
      <ErrorDialogPrimitive.Backdrop className={'media-dialog-backdrop'} />
      <ErrorDialogPrimitive.Popup className={'media-dialog-popup'}>
        <SketchSurface inset={2} draw seedKey={'error-dialog'} />
        <ErrorDialogPrimitive.Title className={'media-dialog-title'} />
        <ErrorDialogPrimitive.Description className={'media-dialog-description'} />
        <ErrorDialogPrimitive.Close render={<Button paper />} className={'media-dialog-close'} />
      </ErrorDialogPrimitive.Popup>
    </ErrorDialogPrimitive.Root>
  );
}
