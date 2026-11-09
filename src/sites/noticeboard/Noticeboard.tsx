// Cosmos Club, variation: Library noticeboard. The whole site is a corkboard: the club flyer, a tear-off sign-up
// sheet, the film pinned up like a poster, chapter photos to jump to, and a question box for the astronomer whose
// questions get pinned to the board.
import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { PapercutPlayer } from '../../lib/PapercutPlayer';
import { useMedia } from '../../lib/use-media';
import { CHAPTERS, chapterAt, clock } from '../../lib/chapters';
import { CLUB, frameAt, useSaved } from '../../lib/club';
import './noticeboard.css';

function Pin({ color = '#b5382c', style }: { color?: string; style?: CSSProperties }) {
  return <span className="nb-pin" style={{ '--pin': color, ...style } as CSSProperties} aria-hidden="true" />;
}

function Note({ className = '', tilt = 0, paper, pin, children, ...rest }: { className?: string; tilt?: number; paper?: string; pin?: string; children: ReactNode; id?: string; 'aria-labelledby'?: string }) {
  return (
    <section className={`nb-note ${className}`} style={{ '--tilt': `${tilt}deg`, '--paper': paper } as CSSProperties} {...rest}>
      <Pin color={pin} />
      {children}
    </section>
  );
}

const TABS = 8;

function TearOff() {
  const [torn, setTorn] = useSaved<number[]>('board-torn', []);
  const [kid, setKid] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [joined, setJoined] = useSaved<string | null>('board-joined', null);
  const open = torn.length > 0 && !joined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!kid.trim()) return setError("Add the child's first name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Add a grown-up's email, like name@example.com.");
    setJoined(kid.trim());
  };

  return (
    <Note className="nb-tearoff" tilt={1.5} paper="#f1e7cc" pin="#e3b23c" aria-labelledby="nb-join">
      <h2 id="nb-join" className="nb-h2">Join the club!</h2>
      <p>Free, every Saturday. No experience needed, just curiosity. Take a tab to sign up.</p>
      {joined ? (
        <p className="nb-joined" role="status">
          <strong>{joined}</strong> is on the list. See you Saturday at 10:30!
          <button type="button" className="nb-link" onClick={() => { setJoined(null); setTorn([]); }}>Undo</button>
        </p>
      ) : open ? (
        <form className="nb-form" onSubmit={submit} noValidate>
          <label>
            <span>Child's first name</span>
            <input value={kid} onChange={(e) => { setKid(e.target.value); setError(''); }} autoComplete="off" />
          </label>
          <label>
            <span>Grown-up's email</span>
            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} autoComplete="email" />
          </label>
          {error && <p className="nb-error" role="alert">{error}</p>}
          <button type="submit" className="nb-button">Put me on the list</button>
        </form>
      ) : null}
      <ul className="nb-tabs" aria-label="Tear-off tabs">
        {Array.from({ length: TABS }, (_, i) => {
          const gone = torn.includes(i);
          return (
            <li key={i}>
              {gone ? (
                <span className="nb-tab nb-tab--gone" aria-hidden="true" />
              ) : (
                <button type="button" className="nb-tab" onClick={() => setTorn((t) => [...t, i])} aria-label="Tear off a tab to sign up">
                  <span>Cosmos Club, Sat 10:30</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Note>
  );
}

interface Question {
  id: number;
  who: string;
  text: string;
  mine?: boolean;
}

const SEED: Question[] = [
  { id: 1, who: 'Mila, 8', text: 'Does Webb ever get lonely out there?' },
  { id: 2, who: 'Theo, 10', text: 'How do they clean the mirrors if nobody can go there?' },
  { id: 3, who: 'Ana, 7', text: 'If light is really old, can Webb see dinosaurs?' },
];
const SLIP_PAPERS = ['#fffaf0', '#c8d5be', '#bfd0d8', '#efc3b6', '#dcc48e'];

function QuestionBox() {
  const [mine, setMine] = useSaved<Question[]>('board-questions', []);
  const [who, setWho] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const all = [...SEED, ...mine];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 5) return setError('Write your question in the box first.');
    setMine((m) => [...m, { id: Date.now(), who: who.trim() || 'Anonymous astronaut', text: text.trim(), mine: true }]);
    setText('');
  };

  return (
    <div className="nb-questions">
      <Note className="nb-ask" tilt={-1} paper="#bfd0d8" pin="#3d5a80" aria-labelledby="nb-ask">
        <h2 id="nb-ask" className="nb-h2">Ask the astronomer</h2>
        <p>Dr. Okafor reads every question out on Saturday. Yours goes straight on the board.</p>
        <form className="nb-form" onSubmit={submit} noValidate>
          <label>
            <span>Your question</span>
            <textarea rows={3} maxLength={140} value={text} onChange={(e) => { setText(e.target.value); setError(''); }} />
          </label>
          <label>
            <span>First name and age (optional)</span>
            <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Leo, 9" autoComplete="off" />
          </label>
          {error && <p className="nb-error" role="alert">{error}</p>}
          <button type="submit" className="nb-button">Pin my question</button>
        </form>
      </Note>
      <ul className="nb-slips" aria-label="Questions on the board" aria-live="polite">
        {all.map((q, i) => (
          <li key={q.id} className="nb-slip" style={{ '--paper': SLIP_PAPERS[i % SLIP_PAPERS.length], '--tilt': `${((i * 37) % 9) - 4}deg` } as CSSProperties}>
            <Pin color={['#b5382c', '#e3b23c', '#3d5a80', '#5d7d5a'][i % 4]} />
            <p className="nb-slip-text">{q.text}</p>
            <p className="nb-slip-who">{q.who}</p>
            {q.mine && (
              <button type="button" className="nb-link nb-unpin" onClick={() => setMine((m) => m.filter((x) => x.id !== q.id))}>
                Unpin
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const CAPTIONS = ['Webb\'s first pictures!', 'Back to cosmic dawn', 'Folded up & launched', 'Why it stays so cold'];

export default function Noticeboard() {
  const media = useMedia();
  const current = chapterAt(media.time);

  return (
    <div className="nb">
      <div className="nb-board">
        <Note className="nb-flyer" tilt={-2} paper="#e7a28f" aria-labelledby="nb-title">
          <p className="nb-type">Library noticeboard, week of 9 November</p>
          <h1 id="nb-title" className="nb-title">{CLUB.name}</h1>
          <p className="nb-flyer-when">{CLUB.when}<br />{CLUB.where}</p>
          <p className="nb-flyer-this">This week: <strong>Cosmic Dawn</strong>. We watch the film, then build a paper Webb telescope with 18 gold mirrors.</p>
          <p className="nb-type">{CLUB.ages}</p>
        </Note>

        <TearOff />

        <div className="nb-poster">
          <Pin color="#e3b23c" style={{ left: '3%', top: '-6px' }} />
          <Pin color="#b5382c" style={{ left: 'auto', right: '3%', top: '-6px' }} />
          <PapercutPlayer mediaRef={media.ref} title="Cosmic Dawn" />
          <aside className="nb-lost" aria-label="Lost and found">
            <p><strong>Lost:</strong> one purple glue stick. Answers to "Gluey". Please return to room B.</p>
          </aside>
        </div>

        <section className="nb-photos" aria-labelledby="nb-photos-title">
          <h2 id="nb-photos-title" className="nb-strip-title">Photos from the film. Tap one to watch that part.</h2>
          <ul className="nb-photo-list">
            {CHAPTERS.map((c, i) => (
              <li key={c.title} style={{ '--tilt': `${[-4, 3, -2, 5][i]}deg` } as CSSProperties}>
                <button type="button" className="nb-polaroid" aria-current={current === i && media.time > 0 ? 'true' : undefined} onClick={() => media.seek(c.start)}>
                  <span className="nb-tape" aria-hidden="true" />
                  <span className="nb-photo"><img src={frameAt(Math.round(c.start + 6))} alt="" loading="lazy" width={480} height={270} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /></span>
                  <span className="nb-caption">{CAPTIONS[i]}</span>
                  <span className="nb-caption-time">{c.title}, {clock(c.start)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <QuestionBox />
      </div>
      <p className="nb-credit">Film: NASA, Cosmic Dawn trailer. Player: Papercut skin for Video.js.</p>
    </div>
  );
}
