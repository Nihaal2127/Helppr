import { fetchUser } from "../../services/userService";
import { fetchFranchise } from "../../services/franchiseService";
import { fetchArea } from "../../services/areaService";
import { FranchiseModel } from "../models/FranchiseModels";
import { AreaModel } from "../models/AreaModel";

export type ReportOptionType = { value: string; label: string };

export const reportAllOption: ReportOptionType = { value: "all", label: "All" };

export const reportFilterLabelClass = "small fw-semibold mb-1";

/** Match Order reports multiselect chip cap. */
export const reportMultiSelectChipsMaxHeight = "90px" as const;

export const CUSTOMER_USER_TYPE = 4;
export const PARTNER_USER_TYPE = 2;

export function reportToIsoCalendarDate(date: Date | null): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function loadAllPartnerOptionsForDropdown(): Promise<
  ReportOptionType[]
> {
  const pageSize = 250;
  const first = await fetchUser(false, PARTNER_USER_TYPE, 1, pageSize, {
    status: "true",
  });
  if (!first.response) return [];
  let all = [...first.users];
  for (let page = 2; page <= first.totalPages; page++) {
    const next = await fetchUser(false, PARTNER_USER_TYPE, page, pageSize, {
      status: "true",
    });
    if (next.response) {
      all = all.concat(next.users);
    }
  }
  const opts = all
    .map((u) => {
      const id = String((u as { _id?: string })._id ?? "").trim();
      if (!id) return null;
      const rawName = (u.name ?? "").trim();
      const email = (u.email ?? "").trim();
      const label = rawName || email || u.phone_number || id;
      return { value: id, label: String(label) };
    })
    .filter((x): x is ReportOptionType => x != null);
  opts.sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
  );
  return opts;
}

export async function loadAllFranchiseRows(): Promise<FranchiseModel[]> {
  const acc: FranchiseModel[] = [];
  const pageSize = 200;
  let page = 1;
  for (;;) {
    const res = await fetchFranchise(page, pageSize, { status: "true" });
    if (res?.response && res.franchises?.length) {
      acc.push(...res.franchises);
    }
    if (!res?.response || !res.totalPages || page >= res.totalPages) break;
    page += 1;
    if (page > 50) break;
  }
  return acc;
}

export async function loadAllAreaRows(): Promise<AreaModel[]> {
  const acc: AreaModel[] = [];
  const pageSize = 200;
  let page = 1;
  for (;;) {
    const res = await fetchArea(page, pageSize, {});
    if (res?.response && res.areas?.length) {
      acc.push(...res.areas);
    }
    if (!res?.response || !res.totalPages || page >= res.totalPages) break;
    page += 1;
    if (page > 100) break;
  }
  return acc;
}
