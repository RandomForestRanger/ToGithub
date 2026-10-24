// Kaptein Evans's portrait. Interim art cropped from art/First Ideas.png; swap the files in src/assets/kaptein/.
import type { Mood } from '../content/kaptein';
import steady from '../assets/kaptein/steady.webp';
import pleased from '../assets/kaptein/pleased.webp';
import worried from '../assets/kaptein/worried.webp';
import overjoyed from '../assets/kaptein/overjoyed.webp';

const FACES: Record<Mood, string> = { steady, pleased, worried, overjoyed };

export function CaptainFace({ mood, size = 64 }: { mood: Mood; size?: number }) {
  return <img className="captain-face" src={FACES[mood]} width={size} height={size} alt="" aria-hidden draggable={false} />;
}

/** Preload the other moods so a change of face doesn't flash. */
export function preloadFaces() {
  Object.values(FACES).forEach(src => { new Image().src = src; });
}
