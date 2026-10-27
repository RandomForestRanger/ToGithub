// A badge: the emblem from the artist brief (src/assets/emblem.webp, ribbon left blank) with the line's
// name written on the ribbon.
import emblem from '../assets/emblem.webp';

const W = 399, H = 400, RIBBON_X = 200, RIBBON_Y = 324, RIBBON_W = 220;

export function Badge({ name, fresh, onClick }: { name: string; fresh?: boolean; onClick?: () => void }) {
  const size = Math.min(40, (40 * 9) / Math.max(1, name.length)); // long names shrink to fit the ribbon
  return (
    <button className={`badge ${fresh ? 'fresh' : ''}`} onClick={onClick} title={name} aria-label={name}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        <defs>
          <filter id="ribbonFeather" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="5" /></filter>
        </defs>
        <image href={emblem} width={W} height={H} />
        {/* a soft ribbon-cream wash under the name, so no trace of the original lettering shows through */}
        <ellipse cx={RIBBON_X} cy={RIBBON_Y - 2} rx={RIBBON_W / 2 - 6} ry={16} fill="#f0d9a8" filter="url(#ribbonFeather)" />
        <text x={RIBBON_X} y={RIBBON_Y} className="badge-name" style={{ fontSize: `${size}px` }}
          textLength={name.length > 12 ? RIBBON_W : undefined} lengthAdjust="spacingAndGlyphs">{name}</text>
      </svg>
    </button>
  );
}
