// The Papercut skin's iPhone Duo layout inside the fold simulator, for the showcase's Duo view (loaded on demand).
import { DuoSimulation, type DuoSimulationProps } from '../../duo-kit/duo-simulation';
import { DuoVideoSkin } from '../../skins/papercut/duo/duo-skin';
import { DEMO_CHAPTERS, DEMO_HLS, DEMO_POSTER, DEMO_TITLE } from '../../media';
// The Duo layout builds on the papercut paper styles, which the regular skin normally brings in.
import '../../skins/papercut/skin/styles/video/base.css';
import '../../skins/papercut/skin/styles/papercut.css';

/** Options for a page that stages the phone itself (the All Duos desk). */
export type StageOptions = Pick<DuoSimulationProps, 'hideControls' | 'controller' | 'onSelectionChange' | 'maxHeight'>;

export default function PapercutDuo(options: StageOptions) {
  return (
    <DuoSimulation
      {...options}
      src={DEMO_HLS}
      poster={DEMO_POSTER}
      chapters={DEMO_CHAPTERS}
      renderSkin={(media) => <DuoVideoSkin title={DEMO_TITLE}>{media}</DuoVideoSkin>}
    />
  );
}
