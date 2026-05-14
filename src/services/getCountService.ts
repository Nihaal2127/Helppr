import { CountModel } from "../models/CountModel";
import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { showLog } from "../helper/utility";
import { sessionMayUseFranchiseIdApiFilter } from "../helper/headerFranchisePreference";

/** Optional fields merged into `POST /getCount` after `type` (when super admin / staff scope dashboards by franchise). */
export type GetCountExtra = {
  franchise_id?: string;
};

export const getCount = async (
  /**
   * Required by the API (`POST /getCount` returns 400 if `type` is missing).
   * Examples: `"service-management"`, `"user-management"`, `"order-management"`, `"franchise-management"`, `"my-franchise"`, `"quote-management"`, or numeric codes where the API still expects them (e.g. location `1`).
   */
  type: number | string,
  extra?: GetCountExtra
): Promise<{
  countModel: CountModel | null | null;
  responseCount: boolean;
}> => {
  try {
    const payload: Record<string, unknown> = { type };
    const fid = String(extra?.franchise_id ?? "").trim();
    if (
      sessionMayUseFranchiseIdApiFilter() &&
      fid &&
      fid.toLowerCase() !== "all"
    ) {
      payload.franchise_id = fid;
    }
    const response = await apiRequest(ApiPaths.GET_COUNT, "POST", payload);
    if (response.success) {
      const d = response.data as Record<string, unknown> | undefined;
      const inner =
        d &&
        typeof d.data === "object" &&
        d.data !== null &&
        !Array.isArray(d.data)
          ? (d.data as Record<string, unknown>)
          : d;
      const record =
        (inner?.record as CountModel | null | undefined) ??
        (d?.record as CountModel | null | undefined) ??
        null;
      return {
        countModel: record,
        responseCount: true,
      };
    } else {
      showLog("Get count failed:", response.message || "Unknown error");
      return {
        countModel: null,
        responseCount: false,
      };
    }
  } catch (error) {
    showLog("Error during get count:", error);
    return {
      countModel: null,
      responseCount: false,
    };
  }
};
