// The bare skin player inside a "How it will look" frame, laid out at the frame's own width the way a page on that
// device would show it. On desktop a player taller than the screen is scaled down to fit; on an upright phone the
// page scrolls instead, as it would on the phone. The sideways phone starts in fullscreen.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Skin } from './registry';
import { START_FULLSCREEN, TOUCH } from './emulate';

export default function DeviceFrame({ skin }: { skin: Skin }) {
  const Player = skin.Player;
  const scroll = TOUCH && !START_FULLSCREEN;
  const ref = useRef<HTMLDivElement>(null);
  const pad = TOUCH ? 12 : 40;
  const [layout, setLayout] = useState({ width: window.innerWidth - pad * 2, scale: 1 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const width = window.innerWidth - pad * 2;
      const h = el.offsetHeight;
      const scale = h && !scroll ? Math.min(1, (window.innerHeight - pad * 2) / h) : 1;
      setLayout((prev) => (prev.width === width && Math.abs(prev.scale - scale) < 0.001 ? prev : { width, scale }));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [pad, scroll]);

  // Press the player's own fullscreen button once it is ready, so the skin's fullscreen layout is what shows.
  useEffect(() => {
    if (!START_FULLSCREEN) return undefined;
    let tries = 0;
    const timer = window.setInterval(() => {
      if (document.fullscreenElement || tries++ > 50) {
        window.clearInterval(timer);
        return;
      }
      document.querySelector<HTMLButtonElement>('button.media-fullscreen-button')?.click();
    }, 200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="shell-device-frame" data-skin={skin.id} data-scroll={scroll ? '' : undefined}>
      <div
        ref={ref}
        className="shell-device-frame-inner"
        style={{ width: layout.width, transform: scroll ? undefined : `translate(-50%, -50%) scale(${layout.scale})` }}
      >
        <Player />
      </div>
    </main>
  );
}
