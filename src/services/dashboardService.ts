import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { DashboardModel } from "../models/DashboardModel";

export const getDashboardData = async (selectedDate: string): Promise<{ response: boolean, dashboard: DashboardModel | null; }> => {
  const response = await apiRequest(`${ApiPaths.GET_DASHBOARD_DATA()}?date=${selectedDate}`, "GET");
  if (response.success) {
    return {
      response: true,
      dashboard: response.data.record,
    };
  } else {
    return {
      response: false,
      dashboard: null,
    };
  }
};