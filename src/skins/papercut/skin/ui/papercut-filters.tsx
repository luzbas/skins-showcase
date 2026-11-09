/** @jsxImportSource react */

'use client';

/**
 * SVG filters that give the papercut skin its hand-cut edges. `papercut.css` points at them by id
 * (`url(#pc-lumpy)`, `url(#pc-lumpy-sm)`). The SVG renders nothing visible and is hidden from assistive tech.
 * It also loads the Gaegu font; React hoists the stylesheet link into the document head and loads it once.
 */
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&display=swap';

export function PapercutFilters() {
  return (
    <>
      <link rel="stylesheet" href={FONT_URL} precedence="default" />
      <svg
        aria-hidden="true"
        focusable="false"
        width="0"
        height="0"
        style={{ position: 'absolute', width: 0, height: 0 }}
      >
        <defs>
          <filter id="pc-lumpy" x="-10%" y="-20%" width="120%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={5} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={9} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="pc-lumpy-sm" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves={2} seed={23} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={4} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* Thin strips such as the timeline: a gentler wobble, so the strip doesn't tear into holes. */}
          <filter id="pc-lumpy-xs" x="-5%" y="-40%" width="110%" height="180%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={1} seed={7} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={2.5} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* Seek-preview frame: roughs up only a thin band around the outside, then lays the untouched inside back
              on top, so the frame edge looks scissor-cut while the thumbnail image stays sharp. */}
          <filter id="pc-ragged-frame" x="-15%" y="-15%" width="130%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves={2} seed={11} result="noise" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={12}
              xChannelSelector="R"
              yChannelSelector="G"
              result="ragged"
            />
            <feMorphology in="SourceAlpha" operator="erode" radius={7} result="inside" />
            <feComposite in="SourceGraphic" in2="inside" operator="in" result="clean" />
            <feMerge>
              <feMergeNode in="ragged" />
              <feMergeNode in="clean" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </>
  );
}
