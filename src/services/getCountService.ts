import { CountModel } from "../models/CountModel";
import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { showLog } from "../helper/utility";

export const getCount = async (
  /** Omit to send `{}`. Otherwise `{ type }` — e.g. `"service-management"`, `"my-franchise"` (franchise-scoped dashboard `record`), `"quote-management"` (quote tab totals in `record`). */
  type?: number | string
): Promise<{
  countModel: CountModel | null | null;
  responseCount: boolean;
}> => {
  try {
    const payload = type === undefined ? {} : { type };
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
