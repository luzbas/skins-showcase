// The Sketch skin's iPhone Duo layout inside the fold simulator, for the showcase's Duo view (loaded on demand).
import { DuoSimulation } from '../../duo-kit/duo-simulation';
import { SketchDuoSkin } from '../../skins/sketch/duo/sketch-duo-skin';
import { DEMO_CHAPTERS, DEMO_HLS, DEMO_POSTER, DEMO_TITLE } from '../../media';

export default function SketchDuo() {
  return (
    <DuoSimulation
      src={DEMO_HLS}
      poster={DEMO_POSTER}
      chapters={DEMO_CHAPTERS}
      renderSkin={(media) => <SketchDuoSkin title={DEMO_TITLE}>{media}</SketchDuoSkin>}
    />
  );
}
