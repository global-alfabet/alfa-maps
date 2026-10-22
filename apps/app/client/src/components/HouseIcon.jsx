
/** Small front-elevation drawing of a house spec, used on house-type cards. */
export default function HouseIcon({ spec, width = 132, height = 78 }) {
  if (!spec || spec.empty) {
    return (
      <svg viewBox="0 0 132 78" width={width} height={height} aria-hidden="true">
        <rect x="0" y="56" width="132" height="22" fill="#9ccf7c" />
        <rect x="14" y="60" width="104" height="14" fill="none" stroke="#1FA45A" strokeDasharray="4 3" strokeWidth="2" />
        <rect x="88" y="30" width="3" height="28" fill="#8a5a36" /><rect x="76" y="28" width="28" height="15" rx="2" fill="#1FA45A" />
        <rect x="80" y="33" width="20" height="2.5" fill="#fff" /><rect x="82" y="37.5" width="15" height="2" fill="#fff" />
      </svg>
    );
  }
  const st = spec.storeys || 1, fh = 14, g = spec.garage || 0;
  const bw = { rect: 58, L: 66, U: 72, T: 64 }[spec.shape] || 58, gw = g ? 10 + g * 7 : 0;
  const total = bw + gw, x0 = (132 - total) / 2, ground = 60, top = ground - st * fh;
  const bx = x0 + gw; const wall = spec.wallColor || "#EFEBE3", roof = spec.roofColor || "#34383D";
  const els = [];
  els.push(<rect key="gr" x="0" y={ground} width="132" height="18" fill="#9ccf7c" />);
  if (spec.pool) els.push(<rect key="pool" x={bx + bw - 26} y={ground + 5} width="30" height="7" rx="2" fill="#56bfdc" />);
  if (g) {
    els.push(<rect key="g" x={x0} y={ground - 12} width={gw} height="12" fill={spec.accent === "brick" ? "#b0664a" : spec.accent === "timber" ? "#9a6a44" : spec.accent === "stone" ? "#a39480" : wall} stroke="#555" strokeWidth=".6" />);
    els.push(<rect key="gr2" x={x0 - 1} y={ground - 13.5} width={gw + 2} height="2" fill="#32363b" />);
    for (let i = 0; i < g; i++) { const dw = (gw - 2 * (g + 1)) / g; els.push(<rect key={"d" + i} x={x0 + 2 + i * (dw + 2)} y={ground - 9} width={dw} height="9" fill="#3a3d42" />); }
  }
  for (let f = 0; f < st; f++) {
    const inset = st === 3 && f === 2 && spec.roof === "flat" ? 8 : 0;
    els.push(<rect key={"f" + f} x={bx + inset} y={ground - (f + 1) * fh} width={bw - 2 * inset} height={fh} fill={wall} stroke="#8d8579" strokeWidth=".6" />);
    const n = Math.max(2, Math.round((bw - 2 * inset) / 16));
    for (let i = 0; i < n; i++) { const wx = bx + inset + 5 + i * ((bw - 2 * inset - 10) / n); if (f === 0 && i === 1) { els.push(<rect key={`door${f}`} x={wx + 1} y={ground - 11} width="5" height="11" fill="#8a5a36" />); continue; } els.push(<rect key={`w${f}${i}`} x={wx} y={ground - (f + 1) * fh + 4} width="7" height="6" fill="#22384a" />); }
  }
  if (spec.balcony && st > 1) els.push(<rect key="bal" x={bx + bw / 2 - 12} y={ground - fh - 1.5} width="24" height="3" fill="#32363b" />);
  if (spec.roof === "flat") els.push(<rect key="r" x={bx - 2} y={top - 3} width={bw + 4} height="3.5" fill={roof} />);
  else if (spec.roof === "gable") els.push(<polygon key="r" points={`${bx - 4},${top} ${bx + bw / 2},${top - 17} ${bx + bw + 4},${top}`} fill={roof} />);
  else els.push(<polygon key="r" points={`${bx - 4},${top} ${bx + 12},${top - 13} ${bx + bw - 12},${top - 13} ${bx + bw + 4},${top}`} fill={roof} />);
  if (spec.solar && spec.roof !== "flat") els.push(<rect key="sol" x={bx + bw / 2 - 10} y={top - 9} width="20" height="4" fill="#1c2a44" />);
  if (spec.veranda) { els.push(<rect key="ver" x={bx - 2} y={ground - 13} width={bw + 4} height="2.5" fill={roof} />); for (let i = 0; i < 5; i++) els.push(<rect key={"vp" + i} x={bx + i * (bw / 4) - 1} y={ground - 11} width="1.6" height="11" fill="#8a5a36" />); }
  if (spec.cottage) els.push(<g key="cot"><rect x="116" y={ground - 9} width="12" height="9" fill={wall} stroke="#8d8579" strokeWidth=".5" /><polygon points={`114,${ground - 9} 122,${ground - 15} 130,${ground - 9}`} fill={roof} /></g>);
  els.push(<circle key="t1" cx="8" cy={ground - 12} r="7" fill="#5a8a3a" />, <rect key="t1s" x="7" y={ground - 6} width="2" height="6" fill="#5b4331" />);
  return <svg viewBox="0 0 132 78" width={width} height={height} aria-hidden="true">{els}</svg>;
}
