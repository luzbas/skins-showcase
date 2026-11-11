// The showcase shell: a fixed index of skins on the left, the selected website (or its device preview) on the right.
import { useEffect, useState } from 'react';
import { HOME_HREF, SKINS, href, resolve, type Route } from './registry';
import DevicePreview from './DevicePreview';
import DuoPreview from './DuoPreview';
import Home from './Home';
import PlayerFrame from './PlayerFrame';
import DeviceFrame from './DeviceFrame';
import { DEVICE } from './emulate';
import { CodeIcon, DevicesIcon, FoldIcon, GridIcon, PlayerIcon, WebsiteIcon } from './icons';

/** The current route. A hash that isn't a route (a site's in-page anchor) keeps the page as it is. */
function useRoute() {
  const [route, setRoute] = useState<Route>(() => resolve(window.location.hash) ?? { page: 'home' });
  useEffect(() => {
    const onChange = () => {
      const next = resolve(window.location.hash);
      if (next) setRoute(next);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

/** Inside a device-preview frame the app renders the bare website, with no index. */
const IS_FRAME = new URLSearchParams(window.location.search).has('frame');

export default function App() {
  const route = useRoute();
  const [open, setOpen] = useState(false);
  const skin = route.page === 'home' ? null : route.skin;
  const variation = route.page === 'skin' ? route.variation : null;
  const view = route.page === 'skin' ? route.view : null;
  const viewName =
    route.page === 'home' ? 'All skins' : view === 'devices' ? 'How it will look' : view === 'duo' ? 'Duo' : 'Website';

  useEffect(() => {
    window.scrollTo(0, 0);
    setOpen(false);
    if (route.page === 'home') document.title = 'Video.js skin showcase';
    else if (route.page === 'player') document.title = `${route.skin.name} skin player`;
    else document.title = IS_FRAME ? `${route.skin.site} · ${route.skin.name} skin` : `${route.skin.name} skin · ${viewName}`;
  }, [route, viewName]);

  if (IS_FRAME) {
    if (route.page === 'player') {
      return DEVICE ? <DeviceFrame skin={route.skin} /> : <PlayerFrame skin={route.skin} />;
    }
    if (route.page === 'skin') {
      const Site = route.variation.Site;
      return (
        <main className="shell-frame-site">
          <Site />
        </main>
      );
    }
  }

  const Site = variation?.Site;

  return (
    <div className="shell" data-open={open ? '' : undefined}>
      <a className="shell-skip" href="#site">
        Skip to the website
      </a>

      <header className="shell-bar">
        <span className="shell-bar-title">
          {skin ? (
            <>
              {skin.name} <span className="shell-bar-sep">/</span> {viewName}
            </>
          ) : (
            'Skin showcase'
          )}
        </span>
        <button
          type="button"
          className="shell-bar-toggle"
          aria-expanded={open}
          aria-controls="skin-index"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Close' : 'All skins'}
        </button>
      </header>

      <nav id="skin-index" className="shell-index" aria-label="Skin index">
        <div className="shell-head">
          <span className="shell-head-title">Skins</span>
          <span className="shell-head-count">{String(SKINS.length).padStart(2, '0')}</span>
        </div>

        <a className="shell-link shell-home-link" href={HOME_HREF} aria-current={route.page === 'home' ? 'page' : undefined}>
          <GridIcon />
          All skins
        </a>

        <ul className="shell-skins">
          {SKINS.map((s, i) => {
            const on = s === skin;
            // A skin with several sites keeps the one being viewed; otherwise its first.
            const v = on && variation ? variation : s.variations[0];
            return (
              <li key={s.id} className="shell-skin" data-on={on ? '' : undefined}>
                <div className="shell-skin-head">
                  <h2 className="shell-skin-name">
                    <span className="shell-skin-num">{String(i + 1).padStart(2, '0')}</span>
                    <span>{s.name}</span>
                  </h2>
                  <div className="shell-skin-ext">
                    <a className="shell-icon" href={s.repo} target="_blank" rel="noreferrer" aria-label={`${s.name} source on GitHub (opens in a new tab)`} title="Source on GitHub">
                      <CodeIcon />
                    </a>
                    <a className="shell-icon" href={s.demo} target="_blank" rel="noreferrer" aria-label={`${s.name} live player demo (opens in a new tab)`} title="Live player demo">
                      <PlayerIcon />
                    </a>
                  </div>
                </div>
                <div className="shell-links">
                  <a className="shell-link" href={href(s, v)} aria-current={on && view === 'site' ? 'page' : undefined}>
                    <WebsiteIcon />
                    Website
                  </a>
                  <a
                    className="shell-link"
                    href={href(s, v, 'devices')}
                    aria-current={on && view === 'devices' ? 'page' : undefined}
                  >
                    <DevicesIcon />
                    How it will look
                  </a>
                  {s.duo && (
                    <a className="shell-link" href={href(s, v, 'duo')} aria-current={on && view === 'duo' ? 'page' : undefined}>
                      <FoldIcon />
                      Duo
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      <button type="button" className="shell-scrim" aria-label="Close skin index" tabIndex={-1} onClick={() => setOpen(false)} />

      <main
        id="site"
        className="shell-site"
        data-view={route.page === 'skin' ? view : 'home'}
        key={route.page === 'skin' ? `${route.skin.id}/${route.variation.id}/${route.view}` : 'home'}
      >
        {route.page === 'skin' && variation && skin ? (
          view === 'devices' ? (
            <DevicePreview skin={skin} variation={variation} />
          ) : view === 'duo' ? (
            <DuoPreview skin={skin} />
          ) : (
            Site && <Site />
          )
        ) : (
          <Home />
        )}
      </main>
    </div>
  );
}
