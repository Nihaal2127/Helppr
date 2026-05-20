/** Time helpers for orders — kept separate from quoteHelpers to avoid circular imports. */

/** `HH:mm` / `HH:mm:ss` or ISO fragment → schedule storage (`2000-01-01THH:mm:00`). */
export function workTimeToTimeStorage(raw: string | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const m24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m24) {
    const h = Math.min(23, parseInt(m24[1], 10));
    const min = Math.min(59, parseInt(m24[2], 10));
    return `2000-01-01T${String(h).padStart(2, "0")}:${String(min).padStart(
      2,
      "0"
    )}:00`;
  }
  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = parseInt(m12[2], 10);
    const ap = m12[3].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return `2000-01-01T${String(h).padStart(2, "0")}:${String(min).padStart(
      2,
      "0"
    )}:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s;
  return "";
}
