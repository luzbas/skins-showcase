// Demo media: NASA's Cosmic Dawn trailer as an adaptive Mux HLS stream (several renditions, English and Japanese
// subtitles, a dubbed audio track), with a chapters file. Swap for your own source.
export const DEMO_HLS = 'https://stream.mux.com/83EzHOvVzVN01AsrD01BCpiH02Pj3S8mfzBOu101w2nHC5s.m3u8';
export const DEMO_POSTER = 'https://image.mux.com/83EzHOvVzVN01AsrD01BCpiH02Pj3S8mfzBOu101w2nHC5s/thumbnail.webp?time=69';
export const DEMO_CHAPTERS = `${import.meta.env.BASE_URL}cosmic-dawn-chapters.vtt`;
export const DEMO_TITLE = 'Cosmic Dawn';

// The Picnic Cinema skin plays a silent film: The Fall of the House of Usher (1928, public domain), streamed from Mux.
export const USHER_ID = 'vQ601DxySQ7nM3en3GWs00025Hhm3vgyIbsqfbaRDbe8mQ';
export const USHER_HLS = `https://stream.mux.com/${USHER_ID}.m3u8`;
export const USHER_POSTER = `https://image.mux.com/${USHER_ID}/thumbnail.webp?time=5`;
export const USHER_TITLE = 'The Fall of the House of Usher';
/** A still frame from the film, for scene cards. */
export const usherFrame = (seconds: number, width = 480) =>
  `https://image.mux.com/${USHER_ID}/thumbnail.webp?time=${seconds}&width=${width}`;
