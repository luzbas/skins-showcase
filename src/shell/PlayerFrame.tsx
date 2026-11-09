// The bare skin player, drawn at a fixed width and scaled to fit the window. Homepage thumbnails load this in a frame.
import { useLayoutEffect, useRef, useState } from 'react';
import type { Skin } from './registry';

/** The width each player is laid out at before it is scaled to fit. */
const PLAYER_W = 1040;
const PAD = 40;

export default function PlayerFrame({ skin }: { skin: Skin }) {
  const Player = skin.Player;
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (!w || !h) return;
      setScale(Math.min((window.innerWidth - PAD * 2) / w, (window.innerHeight - PAD * 2) / h));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, []);

  return (
    <main className="shell-player-frame" data-skin={skin.id}>
      <div ref={ref} className="shell-player-frame-inner" style={{ width: PLAYER_W, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <Player />
      </div>
    </main>
  );
}
