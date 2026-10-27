// A badge: the emblem from the artist brief (src/assets/emblem.webp, ribbon left blank) with the line's
// name written on the ribbon.
import emblem from '../assets/emblem.webp';

const W = 399, H = 400, RIBBON_X = 200, RIBBON_Y = 333, RIBBON_W = 220;

export function Badge({ name, fresh, onClick }: { name: string; fresh?: boolean; onClick?: () => void }) {
  const size = Math.min(40, (40 * 9) / Math.max(1, name.length)); // long names shrink to fit the ribbon
  return (
    <button className={`badge ${fresh ? 'fresh' : ''}`} onClick={onClick} title={name} aria-label={name}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        <image href={emblem} width={W} height={H} />
        <text x={RIBBON_X} y={RIBBON_Y} className="badge-name" style={{ fontSize: `${size}px` }}
          textLength={name.length > 12 ? RIBBON_W : undefined} lengthAdjust="spacingAndGlyphs">{name}</text>
      </svg>
    </button>
  );
}
