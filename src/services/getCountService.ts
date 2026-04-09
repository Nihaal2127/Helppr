import { CountModel } from "../models/CountModel";
import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { showLog } from "../helper/utility";

export const getCount = async (type: number): Promise<{ countModel: CountModel | null | null; responseCount: boolean }> => {
  try {
    const payload = {
      type: type,
    };
    const response = await apiRequest(ApiPaths.GET_COUNT, "POST", payload);
    if (response.success) {
      return {
        countModel: response.data.record,
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