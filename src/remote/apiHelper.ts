import { showSuccessAlert, showErrorAlert } from "../helper/alertHelper";
import { showLoader, hideLoader } from "../components/CustomLoader";
import { ROUTES } from '../routes/Routes';
import { AppConstant } from "../constant/AppConstant";
import { clearLocalStorage } from "../helper/localStorageHelper";
import { ApiPaths } from "./apiPaths";

export const apiRequest = async (
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  payload?: any,
  navigate?: any,
  isMultipart: boolean = false
) => {
  try {
    showLoader();

    const headers: HeadersInit = {
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      ...(isMultipart ? {} : { "Content-Type": "application/json" }),
    };

    const requestUrl = `${AppConstant.BASE_URL}${endpoint}`;
    console.log("API Request URL:", requestUrl);
    //console.log("API header :", headers);
    //console.log("isMultipart :", isMultipart);
    if (isMultipart) {
      payload.forEach((value: FormDataEntryValue, key: string) => {
        //console.log("API FormData :", `${key}: ${value}`);
      });
    } else {
      console.log("API payload :", payload);
    }

    const response = await fetch(requestUrl, {
      method,
      headers,
      body: isMultipart ? payload : JSON.stringify(payload),
    });

    hideLoader();

    const data = await response.json();
    console.log("API Response:", data);
    if (response.ok) {
      if (method !== "GET") {
        if (endpoint !== ApiPaths.LOGOUT() 
        ) {
          const successMessage = data.message || "Operation successful!";
          showSuccessAlert(successMessage);
        }
      }
      return { success: true, data };
    } else {
      if (response.status === 500) {
        if (navigate) navigate(ROUTES.ERROR500.path);
      } else if (response.status === 401) {
        clearLocalStorage();
        if (navigate) navigate(ROUTES.LOGIN.path);
      }

      showErrorAlert(data.message);
      return { success: false, status: data.status, message: data.message };
    }
  } catch (error: any) {
    hideLoader();
    showErrorAlert("An error occurred during the request.");
    console.error("API Error:", error);
    return { success: false, error: error.message || "Network error" };
  }
};

export const apiRequestBlob = async (
  endpoint: string,
  payload: any,
  navigate?: any,
) => {
  try {
    showLoader();

    const headers: HeadersInit = {
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      ...({ "Content-Type": "application/json" }),
    };

    const requestUrl = `${AppConstant.BASE_URL}${endpoint}`;
    console.log("API Request URL:", requestUrl);
    //console.log("API header :", headers);
    console.log("API payload :", payload);

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    hideLoader();
    if (response.ok) {

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/['"]/g, '')
        : 'report.xlsx';

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccessAlert("Download Successfully");
      return { success: true };
    } else {
      if (response.status === 500) {
        if (navigate) navigate(ROUTES.ERROR500.path);
      } else if (response.status === 401) {
        clearLocalStorage();
        if (navigate) navigate(ROUTES.LOGIN.path);
      }

      showErrorAlert("Failed to download the file");
      return { success: false, message: "Failed to download the file" };
    }
  } catch (error: any) {
    hideLoader();
    showErrorAlert("An error occurred during the request.");
    console.error("API Error:", error);
    return { success: false, error: error.message || "Network error" };
  }
};
