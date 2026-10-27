// The thick, well-twisted rope that frames the Kelpwoud (thicker and kinkier than the thin rope on panels).
// Each edge is a strip filled with a seamless pattern of overlapping strands; knots hide the corners.
const T = 16;   // rope thickness, px
const P = 9;    // one strand every P px

/** One strand: ink outline, hemp body, a light highlight and a dark shadow line. Drawn three times
 *  (shifted by a period) so the pattern tiles without seams. */
function Strands() {
  return (
    <>
      {[-P, 0, P].map(dx => (
        <g key={dx} transform={`translate(${dx} 0)`}>
          <path d={`M${P * 0.15} 1.6 C${P * 0.55} 3 ${P * 0.95} ${T - 6} ${P * 1.2} ${T - 1.6}`} className="rs-ink" />
          <path d={`M${P * 0.15} 1.6 C${P * 0.55} 3 ${P * 0.95} ${T - 6} ${P * 1.2} ${T - 1.6}`} className="rs-hemp" />
          <path d={`M${P * 0.1} 3.2 C${P * 0.45} 4.6 ${P * 0.78} ${T - 7} ${P * 0.98} ${T - 3.6}`} className="rs-light" />
          <path d={`M${P * 0.42} 2.4 C${P * 0.8} 4 ${P * 1.1} ${T - 6} ${P * 1.36} ${T - 2.6}`} className="rs-shade" />
        </g>
      ))}
    </>
  );
}

function Knot() {
  return (
    <svg viewBox="-16 -16 32 32" className="rope-knot" aria-hidden>
      <circle r="14" className="rs-ink-fill" />
      <circle r="11.5" className="rs-hemp-fill" />
      {[0, 60, 120, 180, 240, 300].map(a => (
        <path key={a} d="M0 -10 C6 -8 8 -3 6 2" transform={`rotate(${a})`} className="rk-strand" />
      ))}
      <circle r="3.6" className="rs-ink-fill" />
      <circle r="2" cx="-.6" cy="-.6" className="rk-glint" />
    </svg>
  );
}

export function RopeFrame() {
  return (
    <div className="rope-frame" aria-hidden>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <pattern id="ropeH" patternUnits="userSpaceOnUse" width={P} height={T}>
            <rect width={P} height={T} className="rs-bed" /><Strands />
          </pattern>
          <pattern id="ropeV" patternUnits="userSpaceOnUse" width={P} height={T} patternTransform={`rotate(90) translate(0 ${-T})`}>
            <rect width={P} height={T} className="rs-bed" /><Strands />
          </pattern>
        </defs>
      </svg>
      <svg className="rf-edge rf-top"><rect width="100%" height={T} fill="url(#ropeH)" /></svg>
      <svg className="rf-edge rf-bottom"><rect width="100%" height={T} fill="url(#ropeH)" /></svg>
      <svg className="rf-edge rf-left"><rect width={T} height="100%" fill="url(#ropeV)" /></svg>
      <svg className="rf-edge rf-right"><rect width={T} height="100%" fill="url(#ropeV)" /></svg>
      {['tl', 'tr', 'bl', 'br'].map(c => <div key={c} className={`rf-knot rf-${c}`}><Knot /></div>)}
    </div>
  );
}
