/** @jsxImportSource react */

import { Title as TitlePrimitive } from '@videojs/react';

import { SketchSurface } from '../sketch/drawing';

/** The title sits on a paper tag, shown only while there is a title to show. */
export function Title() {
  return (
    <span className={'media-title-tag'}>
      <SketchSurface seedKey={'title'} />
      <TitlePrimitive className={'media-title'} />
    </span>
  );
}
