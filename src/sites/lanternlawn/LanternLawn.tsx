// Picnic Cinema skin website: The Lantern Lawn, Friday-night silent films on a sheet in a community garden, with a
// live pianist. A night garden in ink blue and bulb amber: the page's own festoon string lights up while the film is
// paused and dims while it plays, the same way the skin's bulbs do.
import { useState, type FormEvent } from 'react';
import { PicnicPlayer } from '../../lib/PicnicPlayer';
import { useMedia } from '../../lib/use-media';
import { useNow, useSaved } from '../../lib/club';
import { usherFrame } from '../../media';
import './lanternlawn.css';

/** Moments in the film, timed against the stream (13:12). */
const SCENES = [
  { at: 111, title: 'Supper at the House of Usher', note: 'The guest sits down with Roderick and Madeline.' },
  { at: 174, title: 'Madeline grows pale', note: 'The illness nobody names.' },
  { at: 317, title: 'Down the stairs', note: 'The house starts to bend around them.' },
  { at: 444, title: 'The vault', note: 'A coffin, and a lid that will not stay shut.' },
  { at: 713, title: 'The fall', note: 'Light breaks the house apart.' },
];

const PROGRAMME = [
  { film: 'The Fall of the House of Usher', year: 1928, length: '13 min', tag: 'Tonight' },
  { film: 'A Trip to the Moon', year: 1902, length: '14 min', tag: '' },
  { film: 'Sherlock Jr.', year: 1924, length: '45 min', tag: '' },
  { film: 'The Lost World', year: 1925, length: '93 min', tag: '' },
  { film: 'Nosferatu', year: 1922, length: '94 min', tag: 'Season finale' },
];

const BASKET = [
  { id: 'blanket', item: 'A blanket you can lie on', note: 'The lawn is dry by eight.' },
  { id: 'layer', item: 'A warm layer', note: 'It cools fast after sunset.' },
  { id: 'cushion', item: 'A cushion or two', note: 'For the back row by the hedge.' },
  { id: 'thermos', item: 'Something hot in a flask', note: 'Our tea runs out by the second film.' },
  { id: 'torch', item: 'A small torch, pointed down', note: 'For finding your way out, not your phone.' },
];

const ROWS = ['A', 'B', 'C', 'D'];
const COLS = 6;
/** Spots already claimed for this Friday. */
const TAKEN = new Set(['A3', 'A4', 'B1', 'B5', 'C3', 'D2', 'D6']);

/** The next Friday at 20:30 local time (today counts if it's before 20:30). */
function nextScreening(now: Date) {
  const d = new Date(now);
  d.setHours(20, 30, 0, 0);
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7));
  if (d <= now) d.setDate(d.getDate() + 7);
  return d;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function Festoon({ lit, count = 14 }: { lit: boolean; count?: number }) {
  return (
    <div className="ll-festoon" data-lit={lit ? '' : undefined} aria-hidden="true">
      <svg className="ll-festoon-wire" viewBox="0 0 1000 60" preserveAspectRatio="none">
        <path d="M0 6 Q 250 58 500 30 T 1000 8" />
      </svg>
      <ul>
        {Array.from({ length: count }, (_, i) => {
          // Follow the wire's sag: deepest a quarter of the way along.
          const x = i / (count - 1);
          const y = Math.sin(x * Math.PI * 2 - Math.PI / 2.4) * 0.5 + 0.5;
          return <li key={i} style={{ left: `${x * 100}%`, top: `${8 + (1 - y) * 30}%`, animationDelay: `${(i % 5) * 0.37}s` }} />;
        })}
      </ul>
    </div>
  );
}

function LawnMap({ spot, setSpot }: { spot: string | null; setSpot: (s: string | null) => void }) {
  return (
    <fieldset className="ll-lawn">
      <legend className="ll-sr">Pick a blanket spot. Row A is nearest the screen.</legend>
      <div className="ll-sheet" aria-hidden="true">SCREEN</div>
      <div className="ll-spots">
        {ROWS.map((row) => (
          <div key={row} className="ll-row">
            <span className="ll-row-name" aria-hidden="true">{row}</span>
            {Array.from({ length: COLS }, (_, i) => {
              const id = `${row}${i + 1}`;
              const taken = TAKEN.has(id);
              return (
                <label key={id} className="ll-spot" data-taken={taken ? '' : undefined}>
                  <input
                    type="radio"
                    name="ll-spot"
                    value={id}
                    checked={spot === id}
                    disabled={taken}
                    onChange={() => setSpot(id)}
                  />
                  <span aria-hidden="true">{id}</span>
                  <span className="ll-sr">{`Spot ${id}${taken ? ', taken' : ''}`}</span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
      <p className="ll-lawn-key">
        <span className="ll-key ll-key--free" /> free <span className="ll-key ll-key--taken" /> taken{' '}
        <span className="ll-key ll-key--yours" /> yours
      </p>
    </fieldset>
  );
}

function Reserve({ when }: { when: string }) {
  const [spot, setSpot] = useSaved<string | null>('lawn-spot', null);
  const [booked, setBooked] = useSaved<{ name: string; spot: string; guests: number } | null>('lawn-booking', null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [guests, setGuests] = useState(2);
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!spot) return setError('Pick a spot on the lawn first.');
    if (!name.trim()) return setError('Add a name for the tag on your blanket.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Add an email like name@example.com.');
    setBooked({ name: name.trim(), spot, guests });
  };

  if (booked) {
    return (
      <div className="ll-ticket" role="status">
        <p className="ll-ticket-label">Blanket tag</p>
        <p className="ll-ticket-spot">{booked.spot}</p>
        <p>
          Saved for <strong>{booked.name}</strong> and {booked.guests - 1 === 0 ? 'nobody else' : `${booked.guests - 1} more`}, {when}. Come
          by the gate from 19:45; we'll walk you to your spot.
        </p>
        <button type="button" className="ll-link" onClick={() => { setBooked(null); setSpot(null); }}>
          Give the spot back
        </button>
      </div>
    );
  }

  return (
    <form className="ll-form" onSubmit={submit} noValidate>
      <LawnMap spot={spot} setSpot={(s) => { setSpot(s); setError(''); }} />
      <div className="ll-fields">
        <p className="ll-chosen" aria-live="polite">{spot ? <>Spot <strong>{spot}</strong>, a blanket for up to four.</> : 'No spot picked yet.'}</p>
        <label>
          Name
          <input value={name} autoComplete="name" onChange={(e) => { setName(e.target.value); setError(''); }} />
        </label>
        <label>
          Email
          <input type="email" value={email} autoComplete="email" onChange={(e) => { setEmail(e.target.value); setError(''); }} />
        </label>
        <label>
          On the blanket
          <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n === 1 ? 'Just me' : `${n} people`}</option>)}
          </select>
        </label>
        <button type="submit" className="ll-button">Claim this spot</button>
        {error && <p className="ll-error" role="alert">{error}</p>}
      </div>
    </form>
  );
}

export default function LanternLawn() {
  const { ref, time, playing, seek } = useMedia();
  const now = useNow();
  const [packed, setPacked] = useSaved<string[]>('lawn-basket', []);
  const date = nextScreening(now);
  const when = `Friday ${date.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })} at 20:30`;
  const current = SCENES.reduce((on, s, i) => (time >= s.at ? i : on), -1);

  return (
    <div className="ll" data-playing={playing ? '' : undefined}>
      <header className="ll-top">
        <a className="ll-logo" href="#ll-top">The Lantern Lawn</a>
        <nav aria-label="The Lantern Lawn">
          <ul className="ll-nav">
            <li><a href="#ll-tonight">Tonight</a></li>
            <li><a href="#ll-basket">Bring</a></li>
            <li><a href="#ll-season">Season</a></li>
            <li><a className="ll-nav-cta" href="#ll-reserve">Claim a spot</a></li>
          </ul>
        </nav>
      </header>

      <section id="ll-top" className="ll-hero">
        <Festoon lit={!playing} />
        <div className="ll-hero-text">
          <p className="ll-kicker">Silent films in the community garden · live piano</p>
          <h1 className="ll-title">
            Bring a blanket.<br />
            <em>We'll bring the dark.</em>
          </h1>
          <p className="ll-lede">
            Every Friday from spring to the first cold night, we hang a sheet between the bean poles and project an old film
            with no words, while Inés plays the piano under the apple tree.
          </p>
          <div className="ll-hero-row">
            <a className="ll-button" href="#ll-reserve">Claim a blanket spot</a>
            <p className="ll-next">
              Next screening<br />
              <strong>{when}</strong>
            </p>
          </div>
        </div>
      </section>

      <section id="ll-tonight" className="ll-section" aria-labelledby="ll-tonight-title">
        <div className="ll-head">
          <p className="ll-kicker">Tonight's film</p>
          <h2 id="ll-tonight-title" className="ll-h2">The Fall of the House of Usher</h2>
          <p className="ll-head-note">James Sibley Watson and Melville Webber, 1928 · 13 minutes · public domain</p>
        </div>
        <PicnicPlayer mediaRef={ref} className="ll-player" />
        <p className="ll-player-note" aria-live="polite">
          {playing ? 'Lights down. Enjoy the film.' : 'Lights up. Press play on the tags, or click the remote on the blanket.'}
        </p>

        <h3 className="ll-h3">Five moments to wait for</h3>
        <ol className="ll-scenes">
          {SCENES.map((s, i) => (
            <li key={s.at}>
              <button
                type="button"
                className="ll-scene"
                aria-current={i === current ? 'true' : undefined}
                onClick={() => seek(s.at)}
              >
                <img src={usherFrame(s.at, 360)} alt="" loading="lazy" width={360} height={270} />
                <span className="ll-scene-time">{mmss(s.at)}</span>
                <span className="ll-scene-title">{s.title}</span>
                <span className="ll-scene-note">{s.note}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section id="ll-basket" className="ll-section ll-split" aria-labelledby="ll-basket-title">
        <div>
          <p className="ll-kicker">Pack the basket</p>
          <h2 id="ll-basket-title" className="ll-h2">What to bring</h2>
          <p className="ll-text">
            We have the screen, the projector, the piano and a pot of tea. Everything else is yours. Tick things off as they go in
            the basket; we'll remember on this device.
          </p>
          <p className="ll-count">{packed.length} of {BASKET.length} packed</p>
        </div>
        <ul className="ll-basket">
          {BASKET.map((b) => {
            const on = packed.includes(b.id);
            return (
              <li key={b.id}>
                <label className="ll-tag" data-on={on ? '' : undefined}>
                  <input type="checkbox" checked={on} onChange={() => setPacked((p) => (on ? p.filter((x) => x !== b.id) : [...p, b.id]))} />
                  <span className="ll-tag-item">{b.item}</span>
                  <span className="ll-tag-note">{b.note}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="ll-season" className="ll-section" aria-labelledby="ll-season-title">
        <p className="ll-kicker">This season</p>
        <h2 id="ll-season-title" className="ll-h2">Five Fridays, five old films</h2>
        <ol className="ll-programme">
          {PROGRAMME.map((p, i) => {
            const d = new Date(date);
            d.setDate(d.getDate() + i * 7);
            return (
              <li key={p.film} data-tonight={i === 0 ? '' : undefined}>
                <span className="ll-prog-date">{d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                <span className="ll-prog-film">{p.film}</span>
                <span className="ll-prog-meta">{p.year} · {p.length}</span>
                {p.tag && <span className="ll-prog-tag">{p.tag}</span>}
              </li>
            );
          })}
        </ol>
      </section>

      <section id="ll-reserve" className="ll-section" aria-labelledby="ll-reserve-title">
        <p className="ll-kicker">Free, but the lawn is small</p>
        <h2 id="ll-reserve-title" className="ll-h2">Claim a blanket spot</h2>
        <p className="ll-text">Twenty-four spots on the lawn, one blanket each. Pick yours on the map; row A is right under the screen.</p>
        <Reserve when={when} />
      </section>

      <footer className="ll-foot">
        <span>The Lantern Lawn · rain moves us to the greenhouse</span>
        <span>Film: The Fall of the House of Usher (1928), public domain. Player: Picnic Cinema skin for Video.js.</span>
      </footer>
    </div>
  );
}
