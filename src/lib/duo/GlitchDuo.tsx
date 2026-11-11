// The Glitch skin's iPhone Duo layout inside the fold simulator, for the showcase's Duo view (loaded on demand).
import { DuoSimulation, type DuoSimulationProps } from '../../duo-kit/duo-simulation';
import { AsciiDuoSkin } from '../../skins/ascii/duo/ascii-duo-skin';
import { DEMO_CHAPTERS, DEMO_HLS, DEMO_POSTER, DEMO_TITLE } from '../../media';

/** Options for a page that stages the phone itself (the All Duos desk). */
export type StageOptions = Pick<DuoSimulationProps, 'hideControls' | 'controller' | 'onSelectionChange' | 'maxHeight'>;

export default function GlitchDuo(options: StageOptions) {
  return (
    <DuoSimulation
      {...options}
      src={DEMO_HLS}
      poster={DEMO_POSTER}
      chapters={DEMO_CHAPTERS}
      renderSkin={(media) => <AsciiDuoSkin title={DEMO_TITLE}>{media}</AsciiDuoSkin>}
    />
  );
}
