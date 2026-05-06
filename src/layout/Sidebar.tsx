import React from "react";
import { NavLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { mainMenuItems, profileMenuItems } from "./menuItems";
import {
  clearLocalStorage,
  getLocalStorage,
  setLocalStorage,
} from "../helper/localStorageHelper";
import { AppConstant } from "../constant/AppConstant";
import { isMockAuthSession } from "../helper/authSessionHelper";
import { logout } from "../services/adminService";
import { ROUTES } from "../routes/Routes";
import {
  isMainMenuItemVisibleForRole,
  parseAllowedMenuKeys,
} from "../routes/roleAccess";
import { openConfirmDialog } from "../components/CustomConfirmDialog";
import clsx from "clsx";

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (menuPath: string) => {
    return location.pathname.startsWith(menuPath);
  };

  const role = getLocalStorage(AppConstant.userRole);
  const allowedMenuKeys = parseAllowedMenuKeys(
    getLocalStorage(AppConstant.userAccessibleMenuKeys)
  );
  /** Same allow-list as `isAuthenticatedPathAllowed` in `routes/roleAccess.ts` (path-level guard). */
  const filteredMainMenuItems = mainMenuItems.filter(({ key }) =>
    isMainMenuItemVisibleForRole(key, role, allowedMenuKeys)
  );

  const handleLogoutClick = async (
    event: React.MouseEvent<HTMLAnchorElement>,
    key: string
  ) => {
    if (key === "logout") {
      event.preventDefault();
      openConfirmDialog(
        "Are you sure you want to logout? ",
        "Logout",
        "Cancel",
        async () => {
          const isMockSession = isMockAuthSession();
          const isAdmin = getLocalStorage(AppConstant.isAdmin);
          const response = isMockSession ? true : await logout();
          if (response) {
            clearLocalStorage();
            setLocalStorage(AppConstant.isAdmin, isAdmin);
            navigate(ROUTES.LOGIN.path, { replace: true });
          }
        }
      );
    }
  };

  return (
    <>
      <nav id="sidebar" className="sidebar">
        <h1>helper!</h1>

        {/* <div className="custom-menu">
          <button type="button" id="sidebarCollapse" className="btn" onClick={toggleSidebar}>
            <i className="fa fa-bars"></i>
            <span className="sr-only">Toggle Menu</span>
          </button>
        </div> */}

        <div className="p-4 pt-2">
          <ul className="list-unstyled components mb-5" id="nav-links">
            {filteredMainMenuItems.map(({ key, path, label }) => (
              <li
                key={key || label}
                className={clsx({ active: isActive(path) })}
              >
                <NavLink
                  to={path}
                  className={({ isActive }) =>
                    isActive ? "sidebar-active" : ""
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          <ul className="list-unstyled components mb-2">
            {profileMenuItems.map(({ key, path, label, icon }) => (
              <li key={key || label}>
                <NavLink to={path} onClick={(e) => handleLogoutClick(e, key)}>
                  <img src={icon} alt={label} className="menu-icon" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
