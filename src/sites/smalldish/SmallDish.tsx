// Sketch skin website: Small Dish Society, a four-evening makerspace class where adults turn an old satellite dish
// into a radio telescope. An engineer's notebook on the skin's own dotted paper, in graphite and red pencil: every
// section is a labelled part, like the controls on the player's board.
import { useState, type FormEvent } from 'react';
import { SketchPlayer } from '../../lib/SketchPlayer';
import { useSaved } from '../../lib/club';
import './smalldish.css';

const SESSIONS = [
  { ref: 'S1', title: 'Take the dish apart', text: 'Find the focal point, measure the curve, and work out what your dish can hear.' },
  { ref: 'S2', title: 'Wire the receiver', text: 'LNB, coax and a USB radio receiver. Your laptop becomes the control room.' },
  { ref: 'S3', title: 'Point it at the Sun', text: 'The loudest radio source in the sky. Your first real detection.' },
  { ref: 'S4', title: 'Listen to the Milky Way', text: 'Map the hydrogen glow of our galaxy at 1420 MHz. Take your data home.' },
];

const PARTS = [
  { ref: 'D1', part: 'Satellite dish, 60 cm or bigger', who: 'You, or borrow one of ours', yours: true },
  { ref: 'U2', part: 'LNB and feed', who: 'Provided', yours: false },
  { ref: 'U3', part: 'USB radio receiver (SDR)', who: 'Provided', yours: false },
  { ref: 'W1', part: 'Coax cable, 5 m', who: 'Provided', yours: false },
  { ref: 'M1', part: 'Laptop with a free USB port', who: 'You', yours: true },
];

function DishSketch() {
  return (
    <figure className="sd-fig">
      <svg viewBox="0 0 360 320" role="img" aria-label="Pencil sketch of a satellite dish on a tripod, labelled dish, LNB, feed arm and mount">
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M70 60 C 40 120, 60 200, 130 230 C 150 180, 140 100, 70 60 Z" />
          <path d="M72 64 C 46 120, 64 196, 128 226" strokeWidth="1" opacity="0.6" />
          <path d="M105 150 L 210 118" />
          <rect x="208" y="104" width="34" height="26" rx="4" />
          <path d="M120 200 L 170 230 L 140 300 M170 230 L 200 300 M170 230 L 172 300" />
          <path d="M120 300 L 220 300" strokeWidth="1" />
        </g>
        <g className="sd-fig-red" fill="none" strokeWidth="1.4" strokeLinecap="round">
          <path d="M60 100 L 20 80" /><path d="M242 116 L 290 96" /><path d="M160 136 L 190 180 L 250 180" /><path d="M186 270 L 250 262" />
        </g>
        <g className="sd-fig-labels">
          <text x="0" y="72">DISH</text><text x="292" y="92">LNB</text><text x="254" y="184">FEED ARM</text><text x="254" y="266">MOUNT</text>
        </g>
      </svg>
      <figcaption>FIG. 1 · what you'll take home</figcaption>
    </figure>
  );
}

function SaveSeat() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useSaved<string | null>('dish-seat', null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Add your name so we can label your dish.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Add an email like name@example.com.');
    setSaved(name.trim());
  };

  return (
    <section id="sd-join" className="sd-section" aria-labelledby="sd-join-title">
      <div className="sd-join">
        <div className="sd-join-text">
          <h2 id="sd-join-title" className="sd-join-title">Save a seat</h2>
          <p>Twelve seats per run, parts included. We'll email you the dates and price before you commit to anything.</p>
        </div>
        {saved ? (
          <p className="sd-saved" role="status">
            Seat pencilled in for <strong>{saved}</strong>. Check your email for the dates.{' '}
            <button type="button" className="sd-link" onClick={() => setSaved(null)}>Undo</button>
          </p>
        ) : (
          <form className="sd-form" onSubmit={submit} noValidate>
            <label>
              NAME
              <input value={name} autoComplete="name" onChange={(e) => { setName(e.target.value); setError(''); }} />
            </label>
            <label>
              EMAIL
              <input type="email" value={email} autoComplete="email" onChange={(e) => { setEmail(e.target.value); setError(''); }} />
            </label>
            <button type="submit">Save my seat</button>
            {error && <p className="sd-error" role="alert">{error}</p>}
          </form>
        )}
      </div>
    </section>
  );
}

export default function SmallDish() {
  const [have, setHave] = useSaved<string[]>('dish-parts', []);

  return (
    <div className="sd">
      <header className="sd-top">
        <a className="sd-logo" href="#sd-top"><span>U0</span>SMALL DISH SOCIETY</a>
        <nav aria-label="Small Dish Society">
          <ul className="sd-nav">
            <li><a className="sd-pad" href="#sd-watch">J1 · WATCH</a></li>
            <li><a className="sd-pad" href="#sd-sessions">J2 · SESSIONS</a></li>
            <li><a className="sd-pad" href="#sd-parts">J3 · PARTS</a></li>
            <li><a className="sd-pad sd-pad--red" href="#sd-join">J4 · SIGN UP</a></li>
          </ul>
        </nav>
      </header>

      <section id="sd-top" className="sd-hero">
        <div className="sd-hero-text">
          <p className="sd-label">FOUR-EVENING WORKSHOP AT YOUR LOCAL MAKERSPACE</p>
          <h1 className="sd-title">Build a radio telescope from an <span className="sd-mark">old satellite dish</span>.</h1>
          <p className="sd-lede">For curious adults. No electronics experience needed. Bring a dish if you have one; we'll find you one if you don't.</p>
          <a className="sd-pad sd-pad--red sd-pad--big" href="#sd-join">Save a seat</a>
        </div>
        <DishSketch />
      </section>

      <section id="sd-watch" className="sd-section" aria-labelledby="sd-watch-title">
        <div className="sd-head">
          <h2 id="sd-watch-title" className="sd-h2"><span>IC1</span>Watch first: why astronomers listen</h2>
          <p className="sd-head-note">NASA, Cosmic Dawn, 1:51</p>
        </div>
        <SketchPlayer title="Cosmic Dawn" />
      </section>

      <section id="sd-sessions" className="sd-section" aria-labelledby="sd-sessions-title">
        <h2 id="sd-sessions-title" className="sd-h2"><span>S1–S4</span>Four evenings, one telescope</h2>
        <ol className="sd-sessions">
          {SESSIONS.map((s, i) => (
            <li key={s.ref} className="sd-part" data-last={i === SESSIONS.length - 1 ? '' : undefined}>
              <p className="sd-label">{s.ref} · EVENING {i + 1}</p>
              <p className="sd-part-title">{s.title}</p>
              <p className="sd-part-text">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="sd-parts" className="sd-section" aria-labelledby="sd-parts-title">
        <h2 id="sd-parts-title" className="sd-h2"><span>BOM</span>Parts list</h2>
        <div className="sd-table-wrap">
          <table className="sd-table">
            <thead>
              <tr><th scope="col">REF</th><th scope="col">PART</th><th scope="col">QTY</th><th scope="col">WHO BRINGS IT</th></tr>
            </thead>
            <tbody>
              {PARTS.map((p) => {
                const got = have.includes(p.ref);
                return (
                  <tr key={p.ref}>
                    <td>{p.ref}</td>
                    <td>{p.part}</td>
                    <td>1</td>
                    <td>
                      {p.yours ? (
                        <label className="sd-check">
                          <input
                            type="checkbox"
                            checked={got}
                            onChange={() => setHave((h) => (got ? h.filter((x) => x !== p.ref) : [...h, p.ref]))}
                          />
                          <span>{got ? 'Got it' : p.who}</span>
                        </label>
                      ) : (
                        <span className="sd-provided">{p.who}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="sd-table-note">Tick the parts you're bringing; we'll remember them on this device.</p>
      </section>

      <SaveSeat />

      <footer className="sd-foot">
        <span>SMALL DISH SOCIETY · drawn in pencil, measured twice</span>
        <span>Film: NASA, Cosmic Dawn trailer. Player: Sketch skin for Video.js.</span>
      </footer>
    </div>
  );
}
