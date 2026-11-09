/** @jsxImportSource react */

'use client';

/**
 * Loads the ASCII skin's monospace font (JetBrains Mono, SIL Open Font License, from Google Fonts). It sets both the
 * control text and the glyphs the ASCII screen draws. React hoists the stylesheet link into the document head and
 * loads it once. Without it the font stacks fall back to the system monospace.
 */
const FONT_URL = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&display=swap';

export function AsciiFonts() {
  return <link rel="stylesheet" href={FONT_URL} precedence="default" />;
}
