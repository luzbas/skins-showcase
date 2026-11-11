// The Glitch skin's iPhone Duo layout inside the fold simulator, for the showcase's Duo view (loaded on demand).
import { DuoSimulation } from '../../duo-kit/duo-simulation';
import { AsciiDuoSkin } from '../../skins/ascii/duo/ascii-duo-skin';
import { DEMO_CHAPTERS, DEMO_HLS, DEMO_POSTER, DEMO_TITLE } from '../../media';

export default function GlitchDuo() {
  return (
    <DuoSimulation
      src={DEMO_HLS}
      poster={DEMO_POSTER}
      chapters={DEMO_CHAPTERS}
      renderSkin={(media) => <AsciiDuoSkin title={DEMO_TITLE}>{media}</AsciiDuoSkin>}
    />
  );
}
