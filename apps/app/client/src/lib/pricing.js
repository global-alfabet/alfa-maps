export function rateFor(size, pricing) {
  const tiers = [...(pricing.tiers || [])].sort((a, b) => a.min - b.min); let t = tiers[0] || { cash: 50, finance: 55 };
  tiers.forEach((x) => { if (size >= x.min) t = x; }); return t;
}

/** Cash price, and for each term the upfront amount, fixed monthly payment and total paid. */
export function payments(stand, pricing) {
  const t = rateFor(stand.size, pricing);
  const finRate = t.finance || t.cash;
  const cash = stand.price ? +stand.price : stand.size * t.cash;
  const fin = stand.price ? +stand.price * (finRate / t.cash) : stand.size * finRate;
  const fee = +pricing.agreement_fee || 0, dep = fin * (+pricing.deposit_pct || 0) / 100, bal = fin - dep, admin = bal * (+pricing.admin_pct || 0) / 100, r = (+pricing.interest_pct || 0) / 100 / 12;
  const plans = (pricing.terms || []).map((term) => {
    const n = +term.months; const monthly = r ? bal * r / (1 - Math.pow(1 + r, -n)) : bal / n; const upfront = dep + fee + admin;
    return { months: n, label: term.label || `${n} months`, upfront, monthly, total: upfront + monthly * n };
  });
  return { cashRate: t.cash, financeRate: finRate, cash, cashTotal: cash + fee, financePrice: fin, deposit: dep, fee, plans };
}

export const money = (v, d = 0) => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
