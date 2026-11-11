// "Duo": the skin's iPhone Duo layout, live inside the fold simulator. Pick a pose and the player re-lays itself out
// for the inner display, the propped-up split or the closed outer display, without stopping the video.
import { Suspense } from 'react';
import type { Skin } from './registry';
import { PlayerIcon } from './icons';

export default function DuoPreview({ skin }: { skin: Skin }) {
  const duo = skin.duo;
  if (!duo) return null;
  const Player = duo.Player;
  return (
    <div className="shell-devices shell-duo">
      <header className="shell-devices-head">
        <h1>{skin.name} on the iPhone Duo</h1>
        <p>{duo.blurb}</p>
        <p>
          Pick a pose to fold or turn the phone. The same layouts follow a real foldable through the browser's posture
          and screen-segment signals.
        </p>
        <a className="shell-home-pill shell-duo-link" href={duo.demo} target="_blank" rel="noreferrer">
          <PlayerIcon />
          Open the Duo demo
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      </header>
      <div className="shell-duo-stage">
        <Suspense fallback={<p className="shell-duo-loading">Loading the phone…</p>}>
          <Player />
        </Suspense>
      </div>
    </div>
  );
}
