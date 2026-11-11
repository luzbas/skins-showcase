// The homepage: an editorial index of every skin, each pictured by its own player.
import { useEffect, useRef, useState } from 'react';
import { SKINS, href, type Skin } from './registry';
import { CodeIcon, DevicesIcon, FoldIcon, PlayerIcon, WebsiteIcon } from './icons';

type Layout = 'list' | 'grid';
const LAYOUT_KEY = 'showcase-home-layout';

/** The chosen layout, remembered in this browser when storage is available. */
function useLayout() {
  const [layout, setLayout] = useState<Layout>(() => {
    try {
      return localStorage.getItem(LAYOUT_KEY) === 'grid' ? 'grid' : 'list';
    } catch {
      return 'list';
    }
  });
  const choose = (next: Layout) => {
    setLayout(next);
    try {
      localStorage.setItem(LAYOUT_KEY, next);
    } catch {
      /* storage blocked: the choice lasts until reload */
    }
  };
  return [layout, choose] as const;
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3.5 6h.01" />
      <path d="M3.5 12h.01" />
      <path d="M3.5 18h.01" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  );
}

/** The size the player is drawn at before it is scaled down to the thumbnail. */
const FRAME_W = 1200;
const FRAME_H = 750;

/** A live, non-interactive copy of the skin's player, scaled to fit its box. */
function PlayerThumb({ skin }: { skin: Skin }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / FRAME_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const src = `${window.location.pathname}?frame=1#/player/${skin.id}`;
  return (
    <div ref={ref} className="shell-home-thumb">
      {scale > 0 && (
        <iframe
          src={src}
          title={`${skin.name} skin player`}
          tabIndex={-1}
          aria-hidden="true"
          width={FRAME_W}
          height={FRAME_H}
          style={{ transform: `scale(${scale})` }}
        />
      )}
    </div>
  );
}

export default function Home() {
  const [layout, setLayout] = useLayout();
  return (
    <div className="shell-home" data-layout={layout}>
      <header className="shell-home-head">
        <h1>Video.js v10 skins, each inside a real website</h1>
        <div className="shell-home-tools">
          <span>{String(SKINS.length).padStart(2, '0')} skins</span>
          <div className="shell-home-switch" role="group" aria-label="Layout">
            <button type="button" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}>
              <ListIcon />
              List
            </button>
            <button type="button" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}>
              <GridIcon />
              Grid
            </button>
          </div>
        </div>
      </header>
      <ol className="shell-home-list">
        {SKINS.map((s, i) => {
          const v = s.variations[0];
          return (
            <li key={s.id} className="shell-home-row">
              <span className="shell-home-num">{String(i + 1).padStart(2, '0')}</span>
              <div className="shell-home-body">
                <h2 className="shell-home-title">
                  <a href={href(s, v)}>{s.name}</a>
                </h2>
                <p className="shell-home-desc">{s.description}</p>
                <div className="shell-home-actions">
                  <a className="shell-home-pill" href={href(s, v)}>
                    <WebsiteIcon />
                    Website
                  </a>
                  <a className="shell-home-pill" href={href(s, v, 'devices')}>
                    <DevicesIcon />
                    How it will look
                  </a>
                  {s.duo && (
                    <a className="shell-home-pill" href={href(s, v, 'duo')}>
                      <FoldIcon />
                      Duo
                    </a>
                  )}
                  <span className="shell-home-divider" aria-hidden="true" />
                  <a className="shell-icon" href={s.repo} target="_blank" rel="noreferrer" aria-label={`${s.name} source on GitHub (opens in a new tab)`} title="Source on GitHub">
                    <CodeIcon />
                  </a>
                  <a className="shell-icon" href={s.demo} target="_blank" rel="noreferrer" aria-label={`${s.name} live player demo (opens in a new tab)`} title="Live player demo">
                    <PlayerIcon />
                  </a>
                </div>
              </div>
              <a className="shell-home-shot" href={href(s, v)} tabIndex={-1} aria-hidden="true">
                <PlayerThumb skin={s} />
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
