# Video.js skin showcase

Custom [Video.js v10](https://videojs.org) skins, each shown inside real websites. A fixed index on the left lists every skin and the sites built around it; the selected site fills the right side.

## What's in it

The front page (`#/`) is **All devices**, every skin's player on a monitor and two phones, picked from a cassette rack (below). Each skin also has its website, a "How it will look" view (the skin's player on its own at desktop size and on a phone, upright and sideways in fullscreen, at `#/<skin>/<site>/devices`), its source and its player demo, all linked from the index.

**Papercut** (construction-paper collage skin), shown in the *Cut-Out Cosmos Club*, a Saturday space club for kids designed as a library noticeboard (`#/papercut/noticeboard`):

- The club flyer and a tear-off sign-up sheet: tearing a tab opens the sign-up form.
- The player pinned up like a poster.
- Chapter polaroids (still frames from the film) that jump the player to that part.
- An "ask the astronomer" box that pins each question to the board as a paper slip.

**Clay** (modelling-clay diorama skin), shown in *Little Island TV* (`#/clay/tv-guide`), a two-minute science show for kids made in clay, laid out like a kids' TV guide:

- A "New this Friday" banner over the clay TV, with a button that starts the episode.
- A "What's on this week" schedule that marks today.
- Scene tiles that jump the player to each part and show which one is on screen.
- A "Squish a galaxy" activity with clay swatches to tick off and a print-friendly step list.

**ASCII Glitch** (circuit-board schematic skin), shown in *RELAY_07* (`#/glitch/broadcast`), an independent listening station that pulls space broadcasts out of the noise, as a loud broadcast zine:

- A hero made from the launch frame redrawn as glyphs, the way the skin draws a paused picture, under a torn "COSMIC DAWN".
- A run button and four fragment cards that drive the player and show which fragment is on air.
- An archive and a "tune in" sign-up with a confirmation.

**Sketch** (pencil-schematic skin), shown in *Small Dish Society* (`#/sketch/notebook`), a makerspace class where adults turn an old satellite dish into a radio telescope, as an engineer's notebook:

- Every section is a labelled part (J1 to J4, IC1, S1 to S4, BOM), drawn like the controls on the player's board.
- A pencil sketch of the finished telescope, four evenings wired one to the next, and a parts list where you tick what you're bringing.
- A "save a seat" sign-up with a confirmation.

**Picnic Cinema** (3D outdoor movie-night skin, three.js), shown in *The Lantern Lawn* (`#/picnic/garden`), Friday silent films on a sheet in a community garden:

- A festoon string over the hero that is lit while the film is paused and dims while it plays, like the skin's bulbs.
- *The Fall of the House of Usher* (1928) in the player, with five scene cards that jump to each moment and show which one is on.
- A "what to bring" basket of paper tags to tick off, and the season's programme.
- A lawn map to claim a blanket spot, with a blanket-tag confirmation.

**iPhone Duo**: Papercut, Clay, ASCII Glitch and Sketch also have a layout for foldable phones. Their **Duo** view (`#/<skin>/<site>/duo`, linked in the index) shows it live on an iPhone Duo in a fold simulator: pick a pose (Horizontal or Vertical, each open or closed, or Table) and the player re-lays itself out without stopping the video. **Annotated Page** is in as a player only for now: its How it will look and Duo views, a cassette on All devices and a phone on All Duos. It has no website, source repo or live demo yet, so the index leaves those links out (a skin's `site`, `repo` and `demo`, and a variation's `Site`, are optional).

**All devices** (`#/devices`, first in the index) is every skin's "How it will look" on one desk: a monitor, a phone held upright and a phone lying sideways in fullscreen, with the skins in a cassette rack beside them. Pick a cassette and all three screens switch to that skin's live player; only the picked skin loads. On a phone it shows one device at a time.

**All Duos** (`#/duos`, second in the index) puts the four Duo phones on one desk: they lie closed along its edge, and the one you pick comes up to the stage as the live player with its own pose bar. Picking another closes the one on stage, sends it back to its spot and brings the new one up, so only one video plays (and loads) at a time. The Duo layouts live in each skin's `duo` folder, the fold detection and simulator in `src/duo-kit`, and they load only when the Duo view opens (`src/lib/duo`).

The sites embed their skins through `src/lib/PapercutPlayer.tsx`, `src/lib/ClayPlayer.tsx`, `src/lib/GlitchPlayer.tsx`, `src/lib/SketchPlayer.tsx` and `src/lib/PicnicPlayer.tsx`; `src/lib/use-media.ts` lets page content read the player's time and seek it. Club details and helpers live in `src/lib/club.ts`. Sign-ups and questions are remembered in the browser.

## Run

```bash
npm install
npm run dev
```

## Add a skin

1. Copy the skin into `src/skins/<name>`.
2. Build its website in `src/sites/<site>/`.
3. Register them in `src/shell/registry.ts`. The index and routes pick them up from there.

Routing is hash-based and `vite.config.ts` uses a relative base, so the build works from any GitHub Pages path.

## Credits

Demo films: NASA, *Cosmic Dawn* trailer, and *The Fall of the House of Usher* (1928, public domain) for Picnic Cinema (Mux HLS streams). Licensed Apache 2.0, same as Video.js.
