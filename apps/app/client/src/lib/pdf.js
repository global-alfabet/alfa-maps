import { jsPDF } from "jspdf";
import { money } from "./pricing.js";
import { describe } from "@alfa-maps/engine/presets";
import { words } from "./words.js";

/** Draws boundary lengths on a captured site-plan image, naming neighbours with the estate's word for a plot. */
export const planLabels = (wd = words()) => (g, scene, no) => {
  const inf = scene.info.get(no); if (!inf) return;
  g.font = "600 22px 'Inter Variable', system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  inf.edgesInfo.forEach((d) => {
    const [x, y] = scene.project(d.pt); const l1 = d.L.toFixed(1) + " m", l2 = edgeLabel(d.e, wd);
    const tw = Math.max(g.measureText(l1).width, g.measureText(l2).width) + 18, th = l2 ? 56 : 32;
    g.fillStyle = "rgba(255,255,255,.94)"; g.fillRect(x - tw / 2, y - th / 2, tw, th); g.strokeStyle = "rgba(23,37,42,.35)"; g.strokeRect(x - tw / 2, y - th / 2, tw, th);
    g.fillStyle = "#17252A"; g.fillText(l1, x, l2 ? y - 12 : y); if (l2) { g.fillStyle = "#B8431A"; g.fillText(l2, x, y + 13); }
  });
};
export const drawPlanLabels = planLabels();
export function edgeLabel(e, wd = words()) {
  if (!e || !e.kind) return "";
  if (e.kind === "road") return `Road${e.width ? " " + e.width + " m" : ""}`;
  if (e.kind === "open") return e.label && !e.label.startsWith("U") ? `Open space ${e.label}` : "Open space";
  return e.label ? `${wd.One} ${e.label}` : "Neighbour";
}

export async function standPack({ settings, stand, spec, pay, shots, facts }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 36;
  const accent = settings.brandColor || "#1FA45A";
  const wd = words(settings);
  const bar = () => { doc.setFillColor(accent); doc.rect(0, 0, W, 8, "F"); };
  const foot = (n) => { doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(110); doc.text(`${settings.estateName} - ${wd.One} ${stand.no} - Concept illustration, not an architectural design. Prices exclude VAT.`.replace(/[^\x20-\x7E]/g, ""), M, H - 18); doc.text(`Page ${n}`, W - M, H - 18, { align: "right" }); };
  bar();
  doc.setTextColor(90); doc.setFontSize(10); doc.text(`${settings.estateName}${settings.location ? " - " + settings.location : ""}`.replace(/[^\x20-\x7E]/g, ""), M, 40);
  doc.setTextColor(20); doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.text(`${wd.One} ${stand.no}`, M, 72);
  doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(90); doc.text(`${Math.round(stand.size).toLocaleString()} sq m - ${stand.status === "available" ? "Available" : stand.status === "reserved" ? "Reserved" : "Sold"}${stand.seller ? " - " + stand.seller : ""}`, M, 90);
  const hero = shots.find((s) => s.key === "street") || shots[0];
  const iw = W * .57, ih = iw * 10 / 16; if (hero) doc.addImage(hero.data, "JPEG", M, 104, iw, ih);
  let x = M + iw + 22, y = 110;
  const clean = (t) => String(t).replace(/≈/g, "about ").replace(/m²/g, "sq m").replace(/[–—]/g, "-").replace(/[^\x20-\x7E]/g, "");
  const row = (k, v) => { v = clean(v); k = clean(k); doc.setTextColor(100); doc.text(k, x, y); doc.setTextColor(20); doc.text(String(v), W - M, y, { align: "right" }); y += 14; };
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(20); doc.text("The house shown", x, y); y += 16;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(60);
  doc.splitTextToSize(clean(`${spec.empty ? `Vacant ${wd.one}` : spec.name + " house type"}: ${describe(spec)}`), W - M - x).forEach((l) => { doc.text(l, x, y); y += 12; }); y += 4;
  facts.forEach(([k, v]) => row(k, v)); y += 8;
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(20); doc.text("Price and payments", x, y); y += 16; doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  row("Cash price", money(pay.cash)); row("Cash total with agreement fee", money(pay.cashTotal));
  pay.plans.forEach((p) => { row(`${p.label}: upfront`, money(p.upfront)); row(`${p.label}: monthly`, money(p.monthly, 2)); row(`${p.label}: total`, money(p.total)); });
  y += 6; doc.setFontSize(7.5); doc.setTextColor(110);
  doc.splitTextToSize(`Cash $${pay.cashRate}/sq m, financed $${pay.financeRate}/sq m. ${settings.pricing.deposit_pct}% deposit, $${settings.pricing.agreement_fee} agreement fee, ${settings.pricing.admin_pct}% admin fee on the balance, ${settings.pricing.interest_pct}% a year. Prices exclude VAT.`, W - M - x).forEach((l) => { doc.text(l, x, y); y += 9.5; });
  const c = settings.contact || {}; y += 8; doc.setFontSize(10); doc.setTextColor(20); doc.setFont("helvetica", "bold"); doc.text("Talk to us", x, y); y += 14; doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  [c.name, c.phone && `Phone: ${c.phone}`, c.whatsapp && `WhatsApp: ${c.whatsapp}`, c.email].filter(Boolean).forEach((l) => { doc.text(clean(l), x, y); y += 12; });
  foot(1);
  const rest = shots.filter((s) => s !== hero); let page = 2;
  for (let i = 0; i < rest.length; i += 2) {
    doc.addPage(); bar(); const pair = rest.slice(i, i + 2); const sw = (W - 2 * M - 18) / 2;
    pair.forEach((s, j) => { const px = M + j * (sw + 18); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(20); doc.text(s.title, px, 48); doc.addImage(s.data, "JPEG", px, 60, sw, sw * 10 / 16); });
    foot(page++);
  }
  doc.save(`${wd.one}-${stand.no}.pdf`);
}
