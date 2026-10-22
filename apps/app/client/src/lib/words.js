// What buyers call the land they buy. Each estate sets its own word in settings.unit:
// "plot" (the default, understood everywhere), or e.g. "stand" for estates in Zimbabwe.
export function words(settings) {
  const one = String(settings?.unit || "plot").trim().toLowerCase() || "plot";
  const many = settings?.unitPlural || `${one}s`;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  return { one, many, One: cap(one), Many: cap(many) };
}
