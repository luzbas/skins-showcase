/** @jsxImportSource react */

'use client';

/**
 * The clay skin: a modelling-clay diorama. The video plays on a clay TV standing on a floating grass island, and the
 * controls live on the scenery around it (see ./island/island-skin.tsx). Every piece is a Blender render of the Clay
 * Doh material; only letters and numbers are live text.
 *
 * The previous bar layout is kept in `../../classic-src` for reference.
 */
import '../styles/video/base.css';
import './skin.css';
import '../styles/clay.css';
import type { ComponentProps } from 'react';

import { IslandVideoSkin } from './island/island-skin';

export type VideoSkinProps = ComponentProps<typeof IslandVideoSkin>;

export function VideoSkin(props: VideoSkinProps) {
  return <IslandVideoSkin {...props} />;
}
