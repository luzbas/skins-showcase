// ASCII Glitch skin website: RELAY_07, an independent listening station that pulls space broadcasts out of the
// noise. A loud broadcast-zine layout in the skin's espresso, ochre and terracotta; the hero is the launch frame
// redrawn as glyphs, the way the skin draws a paused picture. The run button, fragment cards and sign-up all work.
import { useState, type FormEvent } from 'react';
import { GlitchPlayer } from '../../lib/GlitchPlayer';
import { useMedia } from '../../lib/use-media';
import { CHAPTERS, chapterAt, clock } from '../../lib/chapters';
import glyphFrame from './feed-glyphs.jpg';
import './relay.css';

const FRAGMENTS = [
  { title: 'A never-before-seen look', text: "Webb's first images, made of heat our eyes can't see." },
  { title: 'The voyage to cosmic dawn', text: 'Looking far away means looking back in time.' },
  { title: 'Building and launching Webb', text: 'Folded to fit a rocket, unfolded a million miles out.' },
  { title: 'The challenges and promise of Webb', text: 'Colder than anything on Earth, so it can feel the faintest warmth.' },
];

const TICKER = ['Signal intact', 'Fragment remains', '4 fragments', '1:51', 'Captions EN / JA'];

function TuneIn() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('That address won’t receive. Try one like name@example.com.');
      return;
    }
    setDone(true);
  };

  if (done)
    return (
      <p className="rl-tuned" role="status">
        Tuned in. Transmission 092 reaches <strong>{email.trim()}</strong> on Monday.
      </p>
    );

  return (
    <form className="rl-form" onSubmit={submit} noValidate>
      <label htmlFor="rl-email" className="visually-hidden">Email</label>
      <input
        id="rl-email"
        type="email"
        value={email}
        placeholder="you@example.com"
        autoComplete="email"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'rl-email-error' : undefined}
        onChange={(e) => { setEmail(e.target.value); setError(''); }}
      />
      <button type="submit">Tune in</button>
      {error && <p id="rl-email-error" className="rl-error">{error}</p>}
    </form>
  );
}

export default function Relay() {
  const media = useMedia();
  const current = chapterAt(media.time);
  const started = media.time > 0;

  return (
    <div className="rl">
      <header className="rl-top">
        <a className="rl-logo" href="#rl-top">RELAY_07</a>
        <nav aria-label="RELAY_07">
          <ul className="rl-nav">
            <li><a href="#rl-watch">Watch</a></li>
            <li><a href="#rl-fragments">Fragments</a></li>
            <li><a href="#rl-archive">Archive</a></li>
            <li><a href="#rl-tune">Tune in</a></li>
          </ul>
        </nav>
      </header>

      <section id="rl-top" className="rl-hero">
        <img className="rl-hero-img" src={glyphFrame} alt="" />
        <p className="rl-kicker">Transmission 091 / recovered 9 Nov 2026</p>
        <h1 className="rl-title">
          <span className="visually-hidden">Cosmic Dawn</span>
          <span aria-hidden="true" className="rl-title-line">COSMIC</span>
          <span aria-hidden="true" className="rl-title-line rl-tear rl-tear--top">DAWN</span>
          <span aria-hidden="true" className="rl-title-line rl-tear rl-tear--bottom">DAWN</span>
        </h1>
        <div className="rl-hero-foot">
          <p className="rl-lede">
            A NASA broadcast about the oldest light in the universe, pulled out of the noise by an independent
            listening station. Pause it and watch it come apart.
          </p>
          <button type="button" className="rl-run" onClick={() => media.seek(0)}>
            {media.playing ? '[ ▶ ON AIR ]' : started ? '[ ↺ RUN FROM THE START ]' : '[ ▶ RUN TRANSMISSION ]'}
          </button>
        </div>
      </section>

      <div className="rl-ticker" aria-hidden="true">
        <div className="rl-ticker-track">
          {[0, 1].map((copy) => (
            <span key={copy} className="rl-ticker-run">
              {TICKER.map((t) => <span key={t}>{t}</span>)}
            </span>
          ))}
        </div>
      </div>

      <section id="rl-watch" className="rl-section" aria-label="Transmission 091">
        <GlitchPlayer mediaRef={media.ref} title="Cosmic Dawn" />
      </section>

      <section id="rl-fragments" className="rl-section" aria-labelledby="rl-fragments-title">
        <h2 id="rl-fragments-title" className="rl-h2">Four fragments</h2>
        <ol className="rl-fragments">
          {CHAPTERS.map((c, i) => {
            const onAir = started && current === i;
            return (
              <li key={c.title}>
                <button type="button" className="rl-fragment" aria-current={onAir ? 'true' : undefined} onClick={() => media.seek(c.start)}>
                  <span className="rl-fragment-no">{String(i + 1).padStart(2, '0')}</span>
                  <span className="rl-fragment-title">{FRAGMENTS[i].title}</span>
                  <span className="rl-fragment-text">{FRAGMENTS[i].text}</span>
                  <span className="rl-fragment-time">
                    {onAir ? (media.playing ? `On air, from ${clock(c.start)}` : `Paused in here, from ${clock(c.start)}`) : `Run from ${clock(c.start)}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rl-section" aria-label="From the transmission">
        <blockquote className="rl-quote">
          <p>Some of this light set off before the Earth existed.</p>
        </blockquote>
      </section>

      <section id="rl-archive" className="rl-section" aria-labelledby="rl-archive-title">
        <h2 id="rl-archive-title" className="rl-h2">Archive</h2>
        <ul className="rl-archive">
          <li>
            <a href="#rl-watch"><span><span className="rl-no">091</span> Cosmic Dawn</span><span className="rl-date">09 Nov 2026</span></a>
          </li>
          <li className="rl-restoring">
            <span><span className="rl-no">090</span> Restoring signal…</span>
            <span className="rl-meter" aria-label="Restoring, 62%"><span style={{ width: '62%' }} /></span>
          </li>
          <li className="rl-restoring">
            <span><span className="rl-no">089</span> Restoring signal…</span>
            <span className="rl-meter" aria-label="Restoring, 18%"><span style={{ width: '18%' }} /></span>
          </li>
        </ul>
      </section>

      <section id="rl-tune" className="rl-tune" aria-labelledby="rl-tune-title">
        <div className="rl-tune-inner">
          <h2 id="rl-tune-title" className="rl-tune-title">Get one transmission every Monday</h2>
          <TuneIn />
        </div>
      </section>

      <footer className="rl-foot">
        <span className="rl-signoff">: signal intact · fragment remains_</span>
        <span>Feed: NASA, Cosmic Dawn trailer. Player: ASCII Glitch skin for Video.js.</span>
      </footer>
    </div>
  );
}
