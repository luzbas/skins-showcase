// "How it will look": the skin's player on its own, live, at desktop size and on a phone held upright and turned
// sideways in fullscreen, each scaled to fit.
import { useEffect, useRef, useState } from 'react';
import type { Skin, Variation } from './registry';

const DEVICES = [
  { id: 'desktop', label: 'Desktop', note: '', w: 1440, h: 900, query: '' },
  { id: 'phone', label: 'Phone', note: 'upright', w: 390, h: 844, query: '&touch' },
  { id: 'phone-fs', label: 'Phone', note: 'sideways, fullscreen', w: 844, h: 390, query: '&touch&fs' },
] as const;

type Device = (typeof DEVICES)[number];

const GAP = 32;
/** The bezel drawn around each screen takes this much room on every side. */
const BEZEL = 8;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function Screen({ device, skin, scale }: { device: Device; skin: Skin; scale: number }) {
  const src = `${window.location.pathname}?frame=1&device=${device.id}${device.query}#/player/${skin.id}`;
  const name = device.note ? `${device.label}, ${device.note}` : device.label;
  return (
    <figure className="shell-device" data-device={device.id}>
      <div className="shell-device-screen" style={{ width: device.w * scale, height: device.h * scale }}>
        <iframe
          src={src}
          title={`${skin.name} player, ${name.toLowerCase()}`}
          width={device.w}
          height={device.h}
          style={{ transform: `scale(${scale})` }}
        />
      </div>
      <figcaption className="shell-device-label">
        {device.label}
        {device.note && <span className="shell-device-note">{device.note}</span>}
        <span>
          {device.w} × {device.h}
        </span>
      </figcaption>
    </figure>
  );
}

export default function DevicePreview({ skin }: { skin: Skin; variation: Variation }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [desktop, upright, sideways] = DEVICES;

  // Desktop takes the full row; the two phones share the row below at one common scale.
  const inner = width - BEZEL * 2;
  const desktopScale = width ? Math.min(1, inner / desktop.w) : 0;
  const pairScale = width ? Math.min(1, (width - GAP - BEZEL * 4) / (upright.w + sideways.w)) : 0;
  const stack = width > 0 && width < 560;

  return (
    <div className="shell-devices">
      <header className="shell-devices-head">
        <h1>{skin.name}</h1>
        <p>
          The {skin.name} player on a desktop screen and on a phone, held upright and turned sideways in fullscreen.
          Each one is the live player, so you can play the video in any of them.
        </p>
      </header>
      <div ref={ref} className="shell-devices-stage">
        {width > 0 && (
          <>
            <Screen device={desktop} skin={skin} scale={desktopScale} />
            <div className="shell-devices-pair">
              <Screen device={upright} skin={skin} scale={stack ? Math.min(1, inner / upright.w) : pairScale} />
              <Screen device={sideways} skin={skin} scale={stack ? Math.min(1, inner / sideways.w) : pairScale} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
