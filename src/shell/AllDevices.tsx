// "All devices": every skin's "How it will look" on one desk. A monitor, a phone held upright and a phone lying
// sideways in fullscreen make the stage; the skins stand in a cassette rack beside it. Pick a cassette and all three
// screens switch to that skin's live player; pick another and they flicker over to it. Only the picked skin loads.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { SKINS, href, type Skin } from './registry';
import papercutImg from '../lib/devices/papercut.webp';
import clayImg from '../lib/devices/clay.webp';
import glitchImg from '../lib/devices/glitch.webp';
import sketchImg from '../lib/devices/sketch.webp';
import picnicImg from '../lib/devices/picnic.webp';
import './all-devices.css';

const LABELS: Record<string, string> = { papercut: papercutImg, clay: clayImg, glitch: glitchImg, sketch: sketchImg, picnic: picnicImg };

type DeviceId = 'desktop' | 'phone' | 'phone-fs';
/** Each device's screen, in CSS px of the page it shows, and the query that sets its frame up. */
const DEVICES: Record<DeviceId, { w: number; h: number; query: string; label: string; short: string }> = {
  desktop: { w: 1440, h: 900, query: '', label: 'Desktop · 1440 × 900', short: 'Desktop' },
  phone: { w: 390, h: 844, query: '&touch', label: 'Phone · upright', short: 'Upright' },
  'phone-fs': { w: 844, h: 390, query: '&touch&fs', label: 'Phone · sideways, fullscreen', short: 'Sideways' },
};

/** The stage as drawn at scale 1: where each device's screen sits and how wide it is. */
const STAGE = { w: 860, h: 780 };
const PLACE: Record<DeviceId, { x: number; y: number; screen: number; tilt: number }> = {
  desktop: { x: 20, y: 10, screen: 580, tilt: 0 },
  phone: { x: 670, y: 22, screen: 160, tilt: -2 },
  'phone-fs': { x: 110, y: 560, screen: 380, tilt: 1.5 },
};
const FLICKER_MS = 180;
const NARROW = '(max-width: 760px)';

function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

/** One device on the desk: its body, and the skin's player in its screen (dark until a skin is picked). */
function Device({ id, skin, width, dim }: { id: DeviceId; skin: Skin | null; width: number; dim: boolean }) {
  const d = DEVICES[id];
  const scale = width / d.w;
  const height = Math.round(d.h * scale);
  const src = skin ? `${window.location.pathname}?frame=1&device=${id}${d.query}#/player/${skin.id}` : null;
  return (
    <figure className="dv-device" data-device={id}>
      <div className="dv-body">
        <div className="dv-screen" style={{ width, height }} data-dim={dim ? '' : undefined}>
          {src && (
            <iframe
              key={src}
              src={src}
              title={`${skin!.name} player, ${d.label.toLowerCase()}`}
              width={d.w}
              height={d.h}
              style={{ transform: `scale(${scale})` }}
            />
          )}
        </div>
      </div>
      {id === 'desktop' && (
        <div className="dv-stand" aria-hidden="true">
          <span />
          <span />
        </div>
      )}
      <figcaption>{d.label}</figcaption>
    </figure>
  );
}

export default function AllDevices() {
  const narrow = useNarrow();
  const [skin, setSkin] = useState<Skin | null>(null);
  const [dim, setDim] = useState(false);
  const [single, setSingle] = useState<DeviceId>('phone');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const pick = (next: Skin | null) => {
    if (next?.id === skin?.id) return;
    timers.current.forEach(clearTimeout);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSkin(next);
      return;
    }
    setDim(true);
    timers.current = [
      window.setTimeout(() => setSkin(next), FLICKER_MS),
      window.setTimeout(() => setDim(false), FLICKER_MS * 2.5),
    ];
  };

  // Fit the drawn stage to the room it has.
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1.35, el.clientWidth / STAGE.w, el.clientHeight / STAGE.h));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [narrow]);

  const variation = skin?.variations[0];

  return (
    <div className="dv" data-narrow={narrow ? '' : undefined}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap" precedence="default" />
      <h1 className="visually-hidden">All devices</h1>

      <div className="dv-main">
        <div className="dv-bar">
          {skin && variation ? (
            <>
              <span className="dv-bar-name" aria-live="polite">
                {skin.name}
              </span>
              <span className="dv-bar-site">in {skin.site}</span>
              <a className="dv-pill" href={href(skin, variation)}>
                Open the website
              </a>
              <button type="button" className="dv-pill" onClick={() => pick(null)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
                Put back
              </button>
            </>
          ) : (
            <p className="dv-hint">Pick a skin to see it on every screen</p>
          )}
          {narrow && (
            <div className="dv-seg" role="group" aria-label="Device">
              {(Object.keys(DEVICES) as DeviceId[]).map((id) => (
                <button key={id} type="button" aria-pressed={single === id} onClick={() => setSingle(id)}>
                  {DEVICES[id].short}
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={stageRef} className="dv-stage">
          {narrow ? (
            <div className="dv-single">
              <Device
                id={single}
                skin={skin}
                dim={dim}
                width={single === 'desktop' ? Math.min(340, window.innerWidth - 60) : single === 'phone' ? 170 : Math.min(340, window.innerWidth - 60)}
              />
            </div>
          ) : (
            scale > 0 && (
              <div className="dv-layout" style={{ width: STAGE.w, height: STAGE.h, transform: `scale(${scale})` }}>
                {(Object.keys(PLACE) as DeviceId[]).map((id) => (
                  <div key={id} className="dv-place" style={{ left: PLACE[id].x, top: PLACE[id].y, rotate: `${PLACE[id].tilt}deg` } as CSSProperties}>
                    <Device id={id} skin={skin} dim={dim} width={PLACE[id].screen} />
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      <section className="dv-rack" aria-label="Skins">
        <p className="dv-rack-title">Skins</p>
        <ul>
          {SKINS.map((s) => {
            const on = skin?.id === s.id;
            return (
              <li key={s.id} data-on={on ? '' : undefined}>
                <button
                  type="button"
                  className="dv-cassette"
                  aria-pressed={on}
                  aria-label={on ? `${s.name} is on every screen` : `Show ${s.name} on every screen`}
                  onClick={() => pick(s)}
                >
                  <img src={LABELS[s.id]} alt="" />
                  <span>{s.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
