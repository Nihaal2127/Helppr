import { getLocalStorage } from "./localStorageHelper";
import { AppConstant, UserRole } from "../constant/AppConstant";

/** True when the user signed in via franchise/employee mock (no real backend token). */
export function isMockAuthSession(): boolean {
  const role = getLocalStorage(AppConstant.userRole);
  if (role === UserRole.FRANCHISE_ADMIN || role === UserRole.EMPLOYEE) {
    return true;
  }
  const token = getLocalStorage(AppConstant.authToken);
  return typeof token === "string" && token.startsWith("mock-");
}
