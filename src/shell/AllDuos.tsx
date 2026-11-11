// "All Duos": the four iPhone Duo layouts on one desk. The phones lie closed along the edge of the desk; pick one and it
// comes up to the stage as the live player, with its own pose bar. Pick another and the one on stage closes, slides
// back to its spot, and the new one comes up. Only the phone on stage is a player, so only one video loads at a time.
import { Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { DuoPoseBar, INITIAL_SELECTION, type DuoSimulationController, type Selection } from '../duo-kit/duo-simulation';
import { SKINS, type Skin } from './registry';
import papercutImg from '../lib/duo/desk/papercut.webp';
import clayImg from '../lib/duo/desk/clay.webp';
import glitchImg from '../lib/duo/desk/glitch.webp';
import sketchImg from '../lib/duo/desk/sketch.webp';
import './all-duos.css';

/** Each phone's picture as it lies closed on the desk (the same pose the simulator starts in), and its tilt. */
const DESK: Record<string, { img: string; tilt: number }> = {
  papercut: { img: papercutImg, tilt: -6 },
  clay: { img: clayImg, tilt: 3 },
  glitch: { img: glitchImg, tilt: -3 },
  sketch: { img: sketchImg, tilt: 5 },
};
const IMG_ASPECT = 895 / 1158;
const FLIGHT_MS = 650;
const FADE_MS = 200;

type Rect = { left: number; top: number; width: number; height: number; tilt: number };
interface Flight {
  id: string;
  rect: Rect;
  /** The flight's end, set a frame after it starts so the move transitions. */
  to: Rect;
  moving: boolean;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height, tilt: 0 };
}

/** A desk phone's box untilted (its tilted bounding box is bigger), centred where it lies, plus its tilt. */
function slotRect(img: HTMLImageElement, tilt: number): Rect {
  const r = img.getBoundingClientRect();
  const width = img.offsetWidth;
  const height = img.offsetHeight;
  return { left: r.left + r.width / 2 - width / 2, top: r.top + r.height / 2 - height / 2, width, height, tilt };
}

/** The picture's box over the live phone: as tall as the phone, centred on it, at the picture's proportions. */
function overDevice(el: Element): Rect {
  const r = rectOf(el);
  const width = r.height * IMG_ASPECT;
  return { left: r.left + r.width / 2 - width / 2, top: r.top, width, height: r.height, tilt: 0 };
}

export default function AllDuos() {
  const duos = SKINS.filter((s) => s.duo && DESK[s.id]);
  /** The phone whose player is mounted on the stage. */
  const [active, setActive] = useState<Skin | null>(null);
  /** The phone off the desk (on stage, or flying to or from it). */
  const [away, setAway] = useState<string | null>(null);
  /** Whether the stage's player is showing (it stays hidden while the picture flies over it). */
  const [live, setLive] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [busy, setBusy] = useState(false);
  const [selection, setSelection] = useState<Selection>(INITIAL_SELECTION);

  const controller = useRef<DuoSimulationController | null>(null);
  const slotImgs = useRef<Record<string, HTMLImageElement | null>>({});
  const activeId = useRef<string | null>(null);
  const queued = useRef<string | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function fly(id: string, from: Rect, to: Rect) {
    if (reducedMotion()) return;
    setFlight({ id, rect: from, to, moving: false });
    await nextFrame();
    setFlight({ id, rect: to, to, moving: true });
    await wait(FLIGHT_MS);
  }

  /** Waits for the stage's player (loaded on demand) to mount and size itself. */
  async function stageDevice(): Promise<HTMLElement | null> {
    for (let i = 0; i < 100; i++) {
      const el = controller.current?.device();
      if (el && el.getBoundingClientRect().height > 0) {
        await nextFrame();
        return el;
      }
      await wait(50);
    }
    return null;
  }

  async function bringUp(skin: Skin) {
    const slot = slotImgs.current[skin.id];
    const from = slot ? slotRect(slot, DESK[skin.id].tilt) : null;
    setAway(skin.id);
    setSelection(INITIAL_SELECTION);
    setLive(false);
    setActive(skin);
    activeId.current = skin.id;
    const device = await stageDevice();
    if (!alive.current) return;
    if (from && device) await fly(skin.id, from, overDevice(device));
    if (!alive.current) return;
    setLive(true);
    await wait(reducedMotion() ? 0 : FADE_MS);
    setFlight(null);
  }

  async function sendHome() {
    const id = activeId.current;
    if (!id) return;
    // Close it first, the way it lay on the desk.
    await controller.current?.select(INITIAL_SELECTION);
    if (!alive.current) return;
    const device = controller.current?.device();
    const slot = slotImgs.current[id];
    if (device && slot && !reducedMotion()) {
      const from = overDevice(device);
      setFlight({ id, rect: from, to: from, moving: false });
      setLive(false);
      await wait(FADE_MS);
      setActive(null);
      activeId.current = null;
      await fly(id, from, slotRect(slot, DESK[id].tilt));
    } else {
      setActive(null);
      activeId.current = null;
    }
    if (!alive.current) return;
    setAway(null);
    setFlight(null);
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
      // A phone picked while the last move was running goes up now.
      while (queued.current && alive.current) {
        const next = SKINS.find((s) => s.id === queued.current);
        queued.current = null;
        if (!next || next.id === activeId.current) continue;
        if (activeId.current) await sendHome();
        await bringUp(next);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  const pick = (skin: Skin) => {
    if (busy) {
      queued.current = skin.id;
      return;
    }
    if (activeId.current === skin.id) return;
    void run(async () => {
      if (activeId.current) await sendHome();
      await bringUp(skin);
    });
  };

  const putBack = () => {
    if (busy || !activeId.current) return;
    void run(sendHome);
  };

  const Player = active?.duo?.Player;

  return (
    <div className="duos" data-busy={busy ? '' : undefined}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap" precedence="default" />
      <h1 className="visually-hidden">All Duos</h1>

      <div className="duos-bar">
        {active ? (
          <>
            <span className="duos-bar-name" aria-live="polite">
              {active.name}
            </span>
            <DuoPoseBar selection={selection} disabled={!live || busy} onPick={(next) => void controller.current?.select(next)} />
            <button type="button" className="duos-putback" onClick={putBack} disabled={busy}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
              Put back
            </button>
          </>
        ) : (
          <p className="duos-hint">Pick a phone to put it on stage</p>
        )}
      </div>

      <div className="duos-stage">
        {!active && !flight && (
          <div className="duos-stage-empty" aria-hidden="true">
            stage
          </div>
        )}
        {Player && (
          <div className="duos-stage-player" data-live={live ? '' : undefined} inert={!live}>
            <Suspense fallback={null}>
              <Player
                hideControls
                controller={controller}
                onSelectionChange={setSelection}
                maxHeight={(h) => Math.max(320, Math.min(620, h - (window.innerWidth < 700 ? 330 : 360)))}
              />
            </Suspense>
          </div>
        )}
      </div>

      <ul className="duos-shelf" aria-label="Duo phones">
        {duos.map((s) => {
          const desk = DESK[s.id];
          const off = away === s.id;
          return (
            <li key={s.id} className="duos-slot" data-away={off ? '' : undefined} style={{ '--tilt': `${desk.tilt}deg` } as CSSProperties}>
              <button
                type="button"
                className="duos-slot-button"
                aria-pressed={off}
                aria-label={off ? `${s.name} is on stage` : `Put ${s.name} on stage`}
                onClick={() => pick(s)}
              >
                <img ref={(el) => void (slotImgs.current[s.id] = el)} src={desk.img} alt="" />
              </button>
              <span className="duos-tag" aria-hidden="true">
                {s.name}
              </span>
            </li>
          );
        })}
      </ul>

      {flight && (
        <img
          className="duos-flyer"
          data-moving={flight.moving ? '' : undefined}
          src={DESK[flight.id].img}
          alt=""
          aria-hidden="true"
          style={
            {
              left: flight.rect.left,
              top: flight.rect.top,
              width: flight.rect.width,
              height: flight.rect.height,
              transform: `rotate(${flight.rect.tilt}deg)`,
              '--ms': `${FLIGHT_MS}ms`,
            } as CSSProperties
          }
        />
      )}
    </div>
  );
}
