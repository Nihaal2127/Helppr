/**
 * Order edit schedule metrics — duplicated from quoteService to avoid
 * orders.ts → quoteService → … → franchiseService circular imports.
 */

export type OrderServiceScheduleMode = "single" | "range" | "hourly";

export type OrderScheduleMetrics = {
  from_date: string;
  to_date: string;
  work_start_time: string;
  work_end_time: string;
  work_hours_per_day: number;
  days: number;
  total_work_hours: number;
};

function str(v: unknown): string {
  if (v == null) return "";
  const s = String(v).trim();
  return s === "undefined" || s === "null" || s === "[object Object]" ? "" : s;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function timeStorageToHHmm(storage: string | null | undefined): string {
  const t = str(storage);
  if (!t) return "09:00";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "09:00";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function daysInclusive(fromYmd: string, toYmd: string): number {
  const a = new Date(fromYmd + "T12:00:00");
  const b = new Date(toYmd + "T12:00:00");
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 1;
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return Math.max(1, diff + 1);
}

function hoursBetweenHHmm(start: string, end: string): number {
  const [sh, sm] = start.split(":").map((x) => parseInt(x, 10));
  const [eh, em] = end.split(":").map((x) => parseInt(x, 10));
  if (!Number.isFinite(sh) || !Number.isFinite(eh)) return 8;
  const t0 = sh * 60 + (sm || 0);
  const t1 = eh * 60 + (em || 0);
  const diff = (t1 - t0) / 60;
  return Math.max(1, Number.isFinite(diff) ? diff : 8);
}

export function deriveOrderScheduleMetrics(input: {
  scheduleMode: OrderServiceScheduleMode;
  requested_date: string;
  requested_date_to: string;
  requested_time: string;
  requested_time_from: string;
  requested_time_to: string;
}): OrderScheduleMetrics | null {
  const from_date = str(input.requested_date);
  if (!from_date) return null;

  let to_date = str(input.requested_date_to) || from_date;
  if (input.scheduleMode === "range") {
    to_date = str(input.requested_date_to) || from_date;
  } else {
    to_date = from_date;
  }

  let work_start_time = "09:00";
  let work_end_time = "17:00";
  if (input.scheduleMode === "hourly") {
    work_start_time = timeStorageToHHmm(input.requested_time_from);
    work_end_time = timeStorageToHHmm(input.requested_time_to);
  } else if (input.scheduleMode === "range") {
    const wf = str(input.requested_time_from);
    const wt = str(input.requested_time_to);
    if (wf && wt) {
      work_start_time = timeStorageToHHmm(wf);
      work_end_time = timeStorageToHHmm(wt);
    } else {
      work_start_time = timeStorageToHHmm(input.requested_time);
      const [h, m] = work_start_time.split(":").map((x) => parseInt(x, 10));
      const endH = Math.min(23, (h || 9) + 2);
      work_end_time = `${pad2(endH)}:${pad2(m || 0)}`;
    }
  } else if (input.scheduleMode === "single") {
    const wf = str(input.requested_time_from);
    const wt = str(input.requested_time_to);
    if (wf && wt) {
      work_start_time = timeStorageToHHmm(wf);
      work_end_time = timeStorageToHHmm(wt);
    } else {
      work_start_time = timeStorageToHHmm(input.requested_time);
      const [h, m] = work_start_time.split(":").map((x) => parseInt(x, 10));
      const endH = Math.min(23, (h || 9) + 2);
      work_end_time = `${pad2(endH)}:${pad2(m || 0)}`;
    }
  } else {
    work_start_time = timeStorageToHHmm(input.requested_time_from);
    work_end_time = timeStorageToHHmm(input.requested_time_to);
  }

  const work_hours_per_day = hoursBetweenHHmm(work_start_time, work_end_time);
  const days = daysInclusive(from_date, to_date);
  const total_work_hours = Math.round(work_hours_per_day * days * 10) / 10;
  return {
    from_date,
    to_date,
    work_start_time,
    work_end_time,
    work_hours_per_day,
    days,
    total_work_hours,
  };
}
