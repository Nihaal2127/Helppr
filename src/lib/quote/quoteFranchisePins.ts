import type { FranchiseRelatedCatalogRecord } from "../../services/quoteService";

/** Normalize to digits only (Indian PIN is 6 digits). */
export function normalizePincodeDigits(raw: unknown): string {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (d.length >= 6) return d.slice(0, 6);
  return d;
}

function str(v: unknown): string {
  if (v == null) return "";
  const s = String(v).trim();
  return s === "undefined" || s === "null" ? "" : s;
}

function asObjectRecords(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x != null && typeof x === "object") as Record<
    string,
    unknown
  >[];
}

export function collectPincodesFromAreaRecord(
  area: Record<string, unknown> | null | undefined
): string[] {
  if (!area) return [];
  const out: string[] = [];
  const single = str(area.pincode ?? area.postal_code ?? area.postcode);
  if (single) out.push(single);
  const rawList =
    area.pincodes ??
    area.pin_codes ??
    area.postal_codes ??
    area.serviceable_pincodes;
  if (Array.isArray(rawList)) {
    for (const x of rawList) {
      if (x == null) continue;
      if (typeof x === "string" || typeof x === "number") {
        const s = str(x);
        if (s) out.push(s);
        continue;
      }
      if (typeof x === "object") {
        const o = x as Record<string, unknown>;
        const p = str(o.pincode ?? o.code ?? o.postal_code ?? o._id);
        if (p) out.push(p);
      }
    }
  }
  const joined = str(area.pincode_list ?? area.pincodes_csv);
  if (joined && joined.includes(",")) {
    for (const part of joined.split(",")) {
      const p = str(part);
      if (p) out.push(p);
    }
  }
  return out;
}

/** `franchise.area_id` may be a string, array of ids, or array of objects with `_id`. */
export function collectFranchiseAreaIds(
  franchise: Record<string, unknown> | null | undefined
): string[] {
  if (!franchise) return [];
  const raw = franchise.area_id ?? franchise.area_ids ?? franchise.areas;
  const ids: string[] = [];
  if (Array.isArray(raw)) {
    for (const x of raw) {
      if (x == null) continue;
      if (typeof x === "string" || typeof x === "number") {
        const id = str(x);
        if (id) ids.push(id);
        continue;
      }
      if (typeof x === "object") {
        const o = x as Record<string, unknown>;
        const id = str(o._id ?? o.id ?? o.area_id);
        if (id) ids.push(id);
      }
    }
    return Array.from(new Set(ids));
  }
  const one = str(raw);
  return one ? [one] : [];
}

function collectPincodesFromFranchiseRecord(
  franchise: Record<string, unknown> | null | undefined
): string[] {
  if (!franchise) return [];
  const out: string[] = [];
  const single = str(
    franchise.pincode ?? franchise.postcode ?? franchise.postal_code
  );
  if (single) out.push(single);
  const raw = franchise.pincodes ?? franchise.serviceable_pincodes;
  if (Array.isArray(raw)) {
    for (const x of raw) out.push(str(x));
  }
  return out.filter(Boolean);
}

function addNormalizedPins(target: Set<string>, rawPins: string[]): void {
  for (const p of rawPins) {
    const n = normalizePincodeDigits(p);
    if (n.length === 6) target.add(n);
  }
}

/**
 * Postcodes served by the franchise using **only** `related-catalog` JSON (no GET /area/get).
 * Sources: `franchise.pincode` / `pincodes`, optional `record.areas` / `franchise_areas`,
 * and `franchise.area_id` when entries are full objects with `pincodes` (not plain id strings).
 */
export function buildFranchisePincodeSetFromRelatedCatalog(
  record: FranchiseRelatedCatalogRecord | null | undefined
): Set<string> {
  const out = new Set<string>();
  if (!record) return out;
  const rec = record as Record<string, unknown>;
  const fr = record.franchise as Record<string, unknown> | undefined;

  addNormalizedPins(out, collectPincodesFromFranchiseRecord(fr));

  for (const a of asObjectRecords(rec.areas)) {
    addNormalizedPins(out, collectPincodesFromAreaRecord(a));
  }
  for (const a of asObjectRecords(rec.franchise_areas)) {
    addNormalizedPins(out, collectPincodesFromAreaRecord(a));
  }

  const rawArea = fr?.area_id ?? fr?.area_ids ?? fr?.areas;
  if (Array.isArray(rawArea)) {
    for (const x of rawArea) {
      if (x != null && typeof x === "object") {
        addNormalizedPins(out, collectPincodesFromAreaRecord(x as Record<string, unknown>));
      }
    }
  }

  return out;
}
