// Every skin in the showcase, and the website built around each one. Add a skin by adding an entry here.
import { lazy, type ComponentType } from 'react';
import Noticeboard from '../sites/noticeboard/Noticeboard';
import LittleIsland from '../sites/littleisland/LittleIsland';
import Relay from '../sites/relay/Relay';
import SmallDish from '../sites/smalldish/SmallDish';
import LanternLawn from '../sites/lanternlawn/LanternLawn';
import { PapercutPlayer } from '../lib/PapercutPlayer';
import { ClayPlayer } from '../lib/ClayPlayer';
import { GlitchPlayer } from '../lib/GlitchPlayer';
import { SketchPlayer } from '../lib/SketchPlayer';
import { PicnicPlayer } from '../lib/PicnicPlayer';

export interface Variation {
  id: string;
  name: string;
  /** One line about the site, shown under its name in the index. */
  fit: string;
  /** Three colours for the little swatch in the index. */
  swatch: [string, string, string];
  Site: ComponentType;
}

export interface Skin {
  id: string;
  name: string;
  description: string;
  /** The website the skin is shown in. */
  site: string;
  repo: string;
  demo: string;
  /** The bare skin player, shown as the skin's picture on the homepage. */
  Player: ComponentType;
  /** The skin's iPhone Duo layout, for skins that have one: shown in the fold simulator in the Duo view. */
  duo?: { Player: ComponentType; demo: string; blurb: string };
  variations: Variation[];
}

export const SKINS: Skin[] = [
  {
    id: 'papercut',
    name: 'Papercut',
    description: 'A construction-paper collage. Every control is a scrap pinned around a taped-down photo.',
    site: 'Cut-Out Cosmos Club',
    repo: 'https://github.com/luzbas/papercut-player',
    demo: 'https://luzbas.github.io/papercut-player/',
    Player: PapercutPlayer,
    duo: {
      Player: lazy(() => import('../lib/duo/PapercutDuo')),
      demo: 'https://luzbas.github.io/papercut-player/duo/',
      blurb: "The paper follows the phone: picture on the top half and a paper board on the bottom when it's propped up, scraps floating over the video when it's open flat, a slim paper rail beside the picture when it's closed.",
    },
    variations: [
      {
        id: 'noticeboard',
        name: 'Library noticeboard',
        fit: 'A kids’ space club on a corkboard of pinned flyers',
        swatch: ['#b98d5a', '#f1e7cc', '#b5382c'],
        Site: Noticeboard,
      },
    ],
  },
  {
    id: 'clay',
    name: 'Clay',
    description: 'A modelling-clay diorama. The video plays on a clay TV on a floating island, with controls in the scenery.',
    site: 'Little Island TV',
    repo: 'https://github.com/luzbas/clay-skin-',
    demo: 'https://luzbas.github.io/clay-skin-/',
    Player: ClayPlayer,
    duo: {
      Player: lazy(() => import('../lib/duo/ClayDuo')),
      demo: 'https://luzbas.github.io/clay-skin-/duo/',
      blurb:
        'A clay console on black: propped up, the picture sits in a black clay frame on the top half with the console of controls below; open flat, the picture goes full-bleed with the console beside or over it; closed, every button moves to a rail of clay keys under the camera.',
    },
    variations: [
      {
        id: 'tv-guide',
        name: 'Kids’ TV guide',
        fit: 'A clay science show, laid out like a TV listings page',
        swatch: ['#e0457b', '#f5c93a', '#9fc9e8'],
        Site: LittleIsland,
      },
    ],
  },
  {
    id: 'glitch',
    name: 'ASCII Glitch',
    description: 'A circuit-board schematic. Every control is a wired unit, and a paused frame turns into glyphs.',
    site: 'RELAY_07',
    repo: 'https://github.com/luzbas/glitch-skin',
    demo: 'https://luzbas.github.io/glitch-skin/',
    Player: GlitchPlayer,
    duo: {
      Player: lazy(() => import('../lib/duo/GlitchDuo')),
      demo: 'https://luzbas.github.io/glitch-skin/duo/',
      blurb:
        'The terminal board on a foldable: propped up, the units lie on the bottom half under the picture; open flat, they float over the video; closed, the keys line up on a rail beside the feed. Pause anywhere and the picture turns to glyphs.',
    },
    variations: [
      {
        id: 'broadcast',
        name: 'Broadcast zine',
        fit: 'A listening station that pulls space broadcasts out of the noise',
        swatch: ['#150d08', '#ffb22e', '#ff6236'],
        Site: Relay,
      },
    ],
  },
  {
    id: 'sketch',
    name: 'Sketch',
    description: 'A pencil schematic. The video is a chip and every control is a part wired to it, on dotted paper.',
    site: 'Small Dish Society',
    repo: 'https://github.com/luzbas/sketch-skin',
    demo: 'https://luzbas.github.io/sketch-skin/',
    Player: SketchPlayer,
    duo: {
      Player: lazy(() => import('../lib/duo/SketchDuo')),
      demo: 'https://luzbas.github.io/sketch-skin/duo/',
      blurb: "The pencil schematic on a foldable: propped up, the parts lie on the bottom half under the picture; open flat, they're drawn over the video; closed, they line up on a rail beside it.",
    },
    variations: [
      {
        id: 'notebook',
        name: 'Engineer’s notebook',
        fit: 'A makerspace class: build a radio telescope from an old dish',
        swatch: ['#eeebe3', '#2b2a27', '#c0392b'],
        Site: SmallDish,
      },
    ],
  },
  {
    id: 'picnic',
    name: 'Picnic Cinema',
    description: 'An outdoor movie night in 3D. The video plays on a sheet in a garden, with controls hanging as tags from festoon bulbs.',
    site: 'The Lantern Lawn',
    repo: 'https://github.com/luzbas/outdoor-video-skin',
    demo: 'https://outdoor-video-skin.vercel.app/',
    Player: PicnicPlayer,
    variations: [
      {
        id: 'garden',
        name: 'Garden film night',
        fit: 'Friday silent films on a sheet in a community garden',
        swatch: ['#0d1626', '#ffc66b', '#f2ead6'],
        Site: LanternLawn,
      },
    ],
  },
];

export type View = 'site' | 'devices' | 'duo';

export type Route =
  | { page: 'home' }
  | { page: 'player'; skin: Skin }
  | { page: 'skin'; skin: Skin; variation: Variation; view: View };

/** Hashes that aren't routes (a site's own in-page anchors, like #li-guide) return null and leave the page alone. */
export function resolve(hash: string): Route | null {
  if (hash === '' || hash === '#' || hash === '#/') return { page: 'home' };
  if (!hash.startsWith('#/')) return null;
  const [first, second, third] = hash.slice(2).split('/');
  if (first === 'player') {
    const skin = SKINS.find((s) => s.id === second) ?? SKINS[0];
    return { page: 'player', skin };
  }
  const skin = SKINS.find((s) => s.id === first);
  if (!skin) return { page: 'home' };
  const variation = skin.variations.find((v) => v.id === second) ?? skin.variations[0];
  const view: View = third === 'devices' ? 'devices' : third === 'duo' && skin.duo ? 'duo' : 'site';
  return { page: 'skin', skin, variation, view };
}

export const HOME_HREF = '#/';

export const href = (skin: Skin, variation: Variation, view: View = 'site') =>
  `#/${skin.id}/${variation.id}${view === 'site' ? '' : `/${view}`}`;
