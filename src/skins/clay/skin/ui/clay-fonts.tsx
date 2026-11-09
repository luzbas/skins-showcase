/** @jsxImportSource react */

'use client';

/**
 * Letters and numbers are the one thing in the clay skin that isn't clay: they stay real text, in Fredoka (SIL Open
 * Font License, from Google Fonts), a soft rounded face that sits well next to the clay. React hoists the stylesheet
 * link into the document head and loads it once. Without it the font stack falls back to rounded system fonts.
 */
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap';

export function ClayFonts() {
  return <link rel="stylesheet" href={FONT_URL} precedence="default" />;
}
