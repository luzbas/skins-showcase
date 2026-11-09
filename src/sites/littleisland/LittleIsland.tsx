// Clay skin website: Little Island TV, a two-minute science show for kids made in clay, laid out like a kids' TV
// guide. Bold blocks in the skin's own clay colours; the player is this week's episode, and the scene tiles, the
// "Watch now" button and the schedule all work with it.
import { useMemo } from 'react';
import { ClayPlayer } from '../../lib/ClayPlayer';
import { useMedia } from '../../lib/use-media';
import { CHAPTERS, chapterAt, clock } from '../../lib/chapters';
import { useSaved } from '../../lib/club';
import discYellow from '../../skins/clay/skin/assets/disc-yellow.webp';
import discPink from '../../skins/clay/skin/assets/disc-pink.webp';
import discLeaf from '../../skins/clay/skin/assets/disc-leaf.webp';
import discSky from '../../skins/clay/skin/assets/disc-sky.webp';
import discOrange from '../../skins/clay/skin/assets/disc-orange.webp';
import discWhite from '../../skins/clay/skin/assets/disc-white.webp';
import './littleisland.css';

const LOGO = [
  { letter: 'L', disc: discYellow, tilt: -6, light: false },
  { letter: 'I', disc: discPink, tilt: 5, light: false },
  { letter: 'T', disc: discLeaf, tilt: -3, light: true },
  { letter: 'V', disc: discSky, tilt: 7, light: false },
];

/** Days are JS getDay() numbers (0 = Sunday). */
const SCHEDULE = [
  { id: 'fri', days: [5], label: 'Fri', time: '8:00', show: 'New episode: Cosmic Dawn', tone: 'ink' },
  { id: 'sat', days: [6], label: 'Sat', time: '10:30', show: 'Squish-along live: make the galaxy with us', tone: 'sky' },
  { id: 'sun', days: [0], label: 'Sun', time: '17:00', show: 'Ask the Island: your questions, answered in clay', tone: 'leaf' },
  { id: 'week', days: [1, 2, 3, 4], label: 'Mon to Thu', time: '7:30', show: 'Breakfast replays', tone: 'white' },
];

const SCENE_TONES = ['yellow', 'pink', 'orange', 'sky'];
const SCENE_TITLES = ['A never-before-seen look', 'The voyage to cosmic dawn', 'Building and launching Webb', 'Why it has to stay so cold'];

const CLAY = [
  { id: 'blue', name: 'Blue', disc: discSky },
  { id: 'pink', name: 'Pink', disc: discPink },
  { id: 'yellow', name: 'Yellow', disc: discYellow },
  { id: 'white', name: 'White', disc: discWhite },
];

const STEPS = [
  'Flatten the blue clay into a pancake the size of your palm. That’s space.',
  'Roll a long pink snake and coil it from the middle out.',
  'Press a small yellow ball into the centre. Every galaxy has a bright heart.',
  'Dot tiny white stars all around it with a toothpick.',
];

const EPISODES = [
  { no: 11, title: 'Why is the sky blue?', disc: discSky },
  { no: 10, title: 'Where do volcanoes come from?', disc: discOrange },
  { no: 9, title: 'How do bees talk to each other?', disc: discYellow },
];

export default function LittleIsland() {
  const media = useMedia();
  const current = chapterAt(media.time);
  const started = media.time > 0;
  const today = useMemo(() => new Date().getDay(), []);
  const [have, setHave] = useSaved<string[]>('island-clay', []);

  return (
    <div className="li">
      <header className="li-top">
        <a className="li-logo" href="#li-top" aria-label="Little Island TV, back to top">
          {LOGO.map((l) => (
            <span key={l.letter} className="li-logo-disc" style={{ rotate: `${l.tilt}deg` }} aria-hidden="true">
              <img src={l.disc} alt="" />
              <span data-light={l.light ? '' : undefined}>{l.letter}</span>
            </span>
          ))}
          <span className="li-logo-name" aria-hidden="true">Little Island TV</span>
        </a>
        <nav aria-label="Little Island TV">
          <ul className="li-nav">
            <li><a href="#li-guide">This week</a></li>
            <li><a href="#li-scenes">Scenes</a></li>
            <li><a href="#li-make">Make it</a></li>
            <li><a href="#li-archive">All episodes</a></li>
          </ul>
        </nav>
      </header>

      <section id="li-top" className="li-hero">
        <div className="li-feature">
          <div>
            <p className="li-kicker">New this Friday</p>
            <h1 className="li-title">Cosmic Dawn</h1>
            <p className="li-lede">Episode 12. How far back in time can a telescope see? We squished a whole galaxy to find out.</p>
          </div>
          <div className="li-actions">
            <button type="button" className="li-pill li-pill--yellow" onClick={() => media.seek(0)}>
              {media.playing ? 'Playing now' : started ? 'Watch from the start' : 'Watch now, 1:51'}
            </button>
            <a className="li-pill li-pill--outline" href="#li-make">Get the activity</a>
          </div>
        </div>
        <div className="li-screen">
          <ClayPlayer mediaRef={media.ref} title="Cosmic Dawn" />
        </div>
      </section>

      <section id="li-guide" className="li-section" aria-labelledby="li-guide-title">
        <div className="li-section-head">
          <h2 id="li-guide-title" className="li-h2">What's on this week</h2>
          <p className="li-note">All times are where you are. Every show is free.</p>
        </div>
        <ul className="li-schedule">
          {SCHEDULE.map((s) => {
            const isToday = s.days.includes(today);
            return (
              <li key={s.id} className="li-slot" data-tone={s.tone} data-today={isToday ? '' : undefined}>
                <p className="li-slot-day">
                  {s.label}
                  {isToday && <span className="li-today">Today</span>}
                </p>
                <p className="li-slot-time">{s.time}</p>
                <p className="li-slot-show">{s.show}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="li-scenes" className="li-section" aria-labelledby="li-scenes-title">
        <h2 id="li-scenes-title" className="li-h2">Jump to a scene</h2>
        <ol className="li-scenes">
          {CHAPTERS.map((c, i) => (
            <li key={c.title}>
              <button
                type="button"
                className="li-scene"
                data-tone={SCENE_TONES[i]}
                aria-current={started && current === i ? 'true' : undefined}
                onClick={() => media.seek(c.start)}
              >
                <span className="li-scene-time">{clock(c.start)}</span>
                <span className="li-scene-title">{SCENE_TITLES[i]}</span>
                {started && current === i && <span className="li-scene-now">{media.playing ? 'On screen now' : 'Paused here'}</span>}
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section id="li-make" className="li-make" aria-labelledby="li-make-title">
        <div className="li-make-text">
          <h2 id="li-make-title" className="li-h2">Squish a galaxy</h2>
          <p className="li-make-lede">Flatten blue for space, coil a pink spiral, press a yellow heart in the middle, then dot white stars with a toothpick.</p>
          <ol className="li-steps">
            {STEPS.map((s) => <li key={s}>{s}</li>)}
          </ol>
          <button type="button" className="li-pill li-pill--cream" onClick={() => window.print()}>Print the steps</button>
        </div>
        <div className="li-clay">
          <p className="li-clay-title">You'll need this clay</p>
          <ul className="li-swatches">
            {CLAY.map((c) => {
              const got = have.includes(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className="li-swatch"
                    aria-pressed={got}
                    onClick={() => setHave((h) => (got ? h.filter((x) => x !== c.id) : [...h, c.id]))}
                  >
                    <img src={c.disc} alt="" />
                    <span>{c.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="li-clay-count" aria-live="polite">
            {have.length === CLAY.length ? 'All four. Ready to squish!' : 'Tap each colour you have.'}
          </p>
        </div>
      </section>

      <section id="li-archive" className="li-section li-section--last" aria-labelledby="li-archive-title">
        <h2 id="li-archive-title" className="li-h2">All episodes</h2>
        <ul className="li-archive">
          {EPISODES.map((e) => (
            <li key={e.no} className="li-episode">
              <span>
                <span className="li-episode-no">Episode {e.no}</span>
                <span className="li-episode-title">{e.title}</span>
                <span className="li-episode-when">Replays Monday to Thursday</span>
              </span>
              <img src={e.disc} alt="" />
            </li>
          ))}
        </ul>
      </section>

      <footer className="li-foot">
        <span>Little Island TV. Captions in English and Japanese.</span>
        <span>Film: NASA, Cosmic Dawn trailer. Player: Clay skin for Video.js.</span>
      </footer>
    </div>
  );
}
