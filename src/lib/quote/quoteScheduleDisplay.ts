import type { QuoteRow, QuoteTabKey } from "../types/quoteTypes";
import { formatQuoteServiceAddressLines } from "./quoteAddressFormat";

/** e.g. `12 Apr 2026` */
function formatDayDdMmmYyyy(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-GB", { month: "short" });
  const yr = d.getFullYear();
  return `${day} ${mon} ${yr}`;
}

/** Parses `10:30 AM` or 24h `17:00` → Date on 2000-01-01 for formatting */
function parseTimeToSameDayDate(t: string): Date | null {
  const trimmed = t.trim();
  const m12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = parseInt(m12[2], 10);
    const ap = m12[3].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return new Date(2000, 0, 1, h, min, 0, 0);
  }
  const m24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!m24) return null;
  const h = parseInt(m24[1], 10);
  const min = parseInt(m24[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return new Date(2000, 0, 1, h, min, 0, 0);
}

/**
 * 12h time for display.
 * `padHour` true → e.g. `05:00 PM` (range lines); false → e.g. `4:30 PM` (single-day line).
 */
function formatTimeAmPm(t: string, padHour = false): string {
  const trimmed = (t ?? "").trim();
  if (!trimmed) return "";
  const d = parseTimeToSameDayDate(trimmed);
  if (!d) return trimmed;
  return d.toLocaleTimeString("en-US", {
    hour: padHour ? "2-digit" : "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function splitHumanTimeRange(t?: string): [string, string] {
  const s = (t ?? "").trim();
  if (!s || s === "-") return ["", ""];
  const parts = s.split(/\s+to\s+/i);
  if (parts.length >= 2) return [parts[0].trim(), parts[1].trim()];
  return [s, ""];
}

function splitDateParts(raw?: string): string[] {
  if (!raw?.trim()) return [];
  const trimmed = raw.trim();
  const parts = trimmed.includes(" to ")
    ? trimmed.split(/\s+to\s+/i).map((p) => p.trim())
    : trimmed.split(/\s+[–—-]\s+/).map((p) => p.trim());
  return parts.filter(Boolean);
}

function buildSingleDayLine(
  dateIso: string,
  timeFrom: string,
  timeTo: string
): string {
  const dStr = formatDayDdMmmYyyy(dateIso);
  if (!dStr) return "-";

  const fa = timeFrom.trim() ? formatTimeAmPm(timeFrom, false) : "";
  const fb = timeTo.trim() ? formatTimeAmPm(timeTo, false) : "";

  if (fa && fb) return `${dStr}, ${fa} to ${fb}`;
  if (fa) return `${dStr}, ${fa}`;
  return dStr;
}

function buildRangeLines(
  fromDateIso: string,
  toDateIso: string,
  timeFrom: string,
  timeTo: string
): string {
  const d1 = formatDayDdMmmYyyy(fromDateIso);
  const d2 = formatDayDdMmmYyyy(toDateIso);
  if (!d1 || !d2) return "-";

  const tf = timeFrom.trim();
  const tt = timeTo.trim();
  const f1 = tf ? formatTimeAmPm(tf, true) : "";
  const f2 = tt ? formatTimeAmPm(tt, true) : "";

  if (tf && !tt) {
    return `From: ${d1}, ${f1}\nTo: ${d2}`;
  }

  const left = f1 ? `${d1}, ${f1}` : d1;
  const right = f2 ? `${d2}, ${f2}` : d2;
  return `From: ${left}\nTo: ${right}`;
}

/** New / pending / failed rows: requested_date + requested_time */
export function formatQuoteRequestedSchedule(row: {
  requested_date?: string;
  requested_time?: string;
}): string {
  const parts = splitDateParts(row.requested_date);
  if (parts.length === 0) return "-";

  const [tFrom, tTo] = splitHumanTimeRange(row.requested_time);

  if (parts.length === 1) {
    return buildSingleDayLine(parts[0], tFrom, tTo);
  }

  return buildRangeLines(parts[0], parts[1], tFrom, tTo);
}

/** Accepted / success rows: scheduled_date + service time window */
export function formatQuoteScheduledDisplay(row: {
  scheduled_date?: string;
  service_from_time?: string;
  service_to_time?: string;
}): string {
  const parts = splitDateParts(row.scheduled_date);
  if (parts.length === 0) return "-";

  const from = (row.service_from_time ?? "").trim();
  const to = (row.service_to_time ?? "").trim();

  if (parts.length === 1) {
    return buildSingleDayLine(parts[0], from, to);
  }

  return buildRangeLines(parts[0], parts[1], from, to);
}

export function formatQuoteScheduleForTable(
  row: QuoteRow,
  tab: QuoteTabKey
): string {
  if (tab === "success" || tab === "accepted") {
    const scheduled = formatQuoteScheduledDisplay({
      scheduled_date: row.scheduled_date,
      service_from_time: row.service_from_time,
      service_to_time: row.service_to_time,
    });
    if (scheduled !== "-") return scheduled;
  }
  return formatQuoteRequestedSchedule({
    requested_date: row.requested_date,
    requested_time: row.requested_time,
  });
}

export function formatQuoteScheduleForView(row: {
  status: string;
  requested_date: string;
  requested_time: string;
  scheduled_date?: string;
  scheduled_time_from?: string;
  scheduled_time_to?: string;
}): string {
  const key = String(row.status ?? "").toLowerCase();
  if (key === "success" || key === "accepted") {
    const scheduled = formatQuoteScheduledDisplay({
      scheduled_date: row.scheduled_date,
      service_from_time: row.scheduled_time_from,
      service_to_time: row.scheduled_time_to,
    });
    if (scheduled !== "-") return scheduled;
  }
  return formatQuoteRequestedSchedule({
    requested_date: row.requested_date,
    requested_time: row.requested_time,
  });
}

/** Collapse repeated comma-separated tokens (e.g. area/city echoed in `street`). */
function dedupeCommaPhrase(phrase: string): string {
  const t = String(phrase ?? "").trim();
  if (!t) return "";
  const parts = t.split(/[,，]/).map((p) => p.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out.join(", ");
}

export function formatServiceAddressLines(q: {
  door_no?: string;
  street?: string;
  area?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
}): string {
  return formatQuoteServiceAddressLines(q);
}
