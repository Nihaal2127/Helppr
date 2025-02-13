import { AppConstant } from "../constant/AppConstant";

export const getLocalStorage = (key: string) => {
    return localStorage.getItem(key);
};

export const setLocalStorage = (key: string, value: any) => {
    localStorage.setItem(key, value);
};

export const removeItemLocalStorage = (key: string) => {
    localStorage.removeItem(key);
};

export const clearLocalStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
};

export const getCreatedById = () => {
    return getLocalStorage(AppConstant.createdById) as string;
  };