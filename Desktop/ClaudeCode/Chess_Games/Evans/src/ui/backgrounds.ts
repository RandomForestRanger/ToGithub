// Game-screen backgrounds: every .webp in src/assets/backgrounds (see CREDITS.md there), one at random per round.
const URLS = Object.values(
  import.meta.glob('../assets/backgrounds/*.webp', { eager: true, query: '?url', import: 'default' }),
) as string[];

let last = -1;

/** A random background URL, never the same one twice in a row (null if the folder is empty). */
export function pickBackground(): string | null {
  if (!URLS.length) return null;
  let i = Math.floor(Math.random() * URLS.length);
  if (URLS.length > 1 && i === last) i = (i + 1 + Math.floor(Math.random() * (URLS.length - 1))) % URLS.length;
  last = i;
  return URLS[i];
}
