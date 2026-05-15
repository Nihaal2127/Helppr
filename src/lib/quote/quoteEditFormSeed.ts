import type { AddQuoteFormValues, QuoteRow } from "../types/quoteTypes";
import { normalizeQuoteApiStatus } from "../../services/quoteService";

export type EditQuoteFormValues = AddQuoteFormValues & {
  quote_status: string;
};

function splitHumanTimeRange(t?: string): [string, string] {
  const s = (t ?? "").trim();
  if (!s || s === "-") return ["", ""];
  const parts = s.split(/\s+to\s+/i);
  if (parts.length >= 2) return [parts[0].trim(), parts[1].trim()];
  return [s, ""];
}

function parseTimeAmPmToDate(t: string): Date | null {
  const trimmed = t.trim();
  const m12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m12) return null;
  let h = parseInt(m12[1], 10);
  const min = parseInt(m12[2], 10);
  const ap = m12[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return new Date(2000, 0, 1, h, min, 0, 0);
}

function timeStorageFromDate(date: Date | null): string {
  return date
    ? `2000-01-01T${String(date.getHours()).padStart(2, "0")}:${String(
        date.getMinutes()
      ).padStart(2, "0")}:00`
    : "";
}

/** `HH:mm` / `HH:mm:ss` or `h:mm AM` → CustomTimePicker storage string. */
export function workTimeToTimeStorage(raw: string | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const m24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m24) {
    const h = Math.min(23, parseInt(m24[1], 10));
    const min = Math.min(59, parseInt(m24[2], 10));
    return `2000-01-01T${String(h).padStart(2, "0")}:${String(
      min
    ).padStart(2, "0")}:00`;
  }
  const d = parseTimeAmPmToDate(s);
  return d ? timeStorageFromDate(d) : "";
}

function ymdChunk(isoish: string): string {
  const x = isoish.trim();
  if (!x) return "";
  if (x.length >= 10 && x[4] === "-") return x.slice(0, 10);
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return x;
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function seedEditQuoteFormFromRow(row: QuoteRow): EditQuoteFormValues {
  const statusKey = normalizeQuoteApiStatus(row.status) || "new";
  const useScheduled = statusKey === "accepted" || statusKey === "success";

  let requested_date = "";
  let requested_date_to = "";
  let requested_time_from = "";
  let requested_time_to = "";

  if (useScheduled) {
    const sched = String(row.scheduled_date ?? "").trim();
    if (sched) {
      requested_date = ymdChunk(sched);
      requested_time_from = workTimeToTimeStorage(row.service_from_time);
      requested_time_to = workTimeToTimeStorage(row.service_to_time);
    } else {
      // GET /quote/get often has from_date + work_* only (no scheduled_date).
      const fromYmd = row.from_date ? ymdChunk(row.from_date) : "";
      const toYmd = row.to_date ? ymdChunk(row.to_date) : "";
      requested_date = fromYmd;
      requested_date_to = toYmd && toYmd !== fromYmd ? toYmd : "";
      requested_time_from = workTimeToTimeStorage(row.work_start_time);
      requested_time_to = workTimeToTimeStorage(row.work_end_time);
    }
  } else {
    const fromYmd = row.from_date
      ? ymdChunk(row.from_date)
      : "";
    const toYmd = row.to_date ? ymdChunk(row.to_date) : "";

    if (fromYmd) {
      requested_date = fromYmd;
      requested_date_to =
        toYmd && toYmd !== fromYmd ? toYmd : "";
    } else {
      const dateRaw = String(row.requested_date ?? "").trim();
      const dateParts = dateRaw
        ? dateRaw.split(/\s+to\s+/i).map((p) => p.trim()).filter(Boolean)
        : [];
      requested_date = dateParts[0] ? ymdChunk(dateParts[0]) : "";
      requested_date_to =
        dateParts.length > 1 ? ymdChunk(dateParts[1]) : "";
    }

    if (row.work_start_time || row.work_end_time) {
      requested_time_from = workTimeToTimeStorage(row.work_start_time);
      requested_time_to = workTimeToTimeStorage(row.work_end_time);
    } else {
      const [a, b] = splitHumanTimeRange(row.requested_time);
      requested_time_from = workTimeToTimeStorage(a);
      requested_time_to = workTimeToTimeStorage(b);
    }
  }

  const partnerVal = String(
    row.partner_id ?? row.partner_user_id ?? ""
  ).trim();

  return {
    franchise_id: String(row.franchise_id ?? "").trim(),
    user_id: String(row.user_id ?? "").trim(),
    user_name: String(row.user_name ?? "").trim(),
    requested_services: String(row.service_id ?? "").trim(),
    requested_partner: partnerVal,
    employee_id: String(row.employee_id ?? "").trim(),
    category_id: String(row.category_id ?? "").trim(),
    requested_date,
    requested_date_to,
    requested_time: "",
    requested_time_from,
    requested_time_to,
    service_price:
      row.service_price != null && Number.isFinite(row.service_price)
        ? String(row.service_price)
        : "",
    description: String(row.description ?? "").trim(),
    quote_status: statusKey || "new",
  };
}
