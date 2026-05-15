/** Shared address display helpers (Add Quote + Quote edit / view). */

function strTrim(v: unknown): string {
  if (v == null) return "";
  const s = String(v).trim();
  return s === "undefined" || s === "null" ? "" : s;
}

/** Expand very short state tokens when the API sends abbreviations (e.g. AP). */
export function displayStateName(raw: string): string {
  const t = strTrim(raw);
  if (!t) return "";
  if (t.length > 3) return t;
  const abbr: Record<string, string> = {
    AP: "Andhra Pradesh",
    TG: "Telangana",
    TS: "Telangana",
    TN: "Tamil Nadu",
    KA: "Karnataka",
    KL: "Kerala",
    MH: "Maharashtra",
    DL: "Delhi",
    UP: "Uttar Pradesh",
    GJ: "Gujarat",
    WB: "West Bengal",
    BR: "Bihar",
    MP: "Madhya Pradesh",
    RJ: "Rajasthan",
    OD: "Odisha",
    OR: "Odisha",
    PB: "Punjab",
    HR: "Haryana",
  };
  const key = t.toUpperCase();
  return abbr[key] ?? t;
}

export function formatAddressLineFromRecord(rec: Record<string, unknown>): string {
  const parts = [
    strTrim(rec.door_no),
    strTrim(rec.street ?? rec.address_line ?? rec.address),
    strTrim(rec.area_name ?? rec.area),
    strTrim(rec.city_name ?? rec.city),
    strTrim(rec.landmark),
    strTrim(rec.pincode),
  ].filter(Boolean);
  return parts.join(", ");
}
