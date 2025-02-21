import { CountModel } from "../models/CountModel";
import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";

export const getCount = async (type : number): Promise<{ countModel: CountModel | null | null; response: boolean }> => {
  try {
    const payload = {
      type: type,
  };
    const response = await apiRequest(ApiPaths.GET_COUNT, "POST", payload);
    if (response.success) {
      return {
        countModel: response.data.record,
        response: true,
      };
    } else {
      console.log("Get count failed:", response.message || "Unknown error");
      return {
        countModel: null,
        response: false,
      };
    }
  } catch (error) {
    console.log("Error during get count:", error);
    return {
      countModel: null,
      response: false,
    };
  }
};