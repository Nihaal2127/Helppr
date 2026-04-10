import React from "react";
import { NavLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { mainMenuItems, profileMenuItems } from "./menuItems";
import { clearLocalStorage, getLocalStorage, setLocalStorage } from "../helper/localStorageHelper";
import { AppConstant, UserRole } from "../constant/AppConstant";
import { logout } from "../services/adminService";
import { ROUTES } from "../routes/Routes";
import { openConfirmDialog } from "../components/CustomConfirmDialog";
import clsx from "clsx"; 

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (menuPath: string) => {
    return location.pathname.startsWith(menuPath);
  };

  const role = getLocalStorage(AppConstant.userRole);
  const filteredMainMenuItems = mainMenuItems.filter(({ key }) => {
    // Admin should not see "My Franchise"
    if (role === UserRole.ADMIN) {
      return key !== "my-franchise";
    }

    // Franchise admin / Employee should not see these admin-only sections
    if (role === UserRole.FRANCHISE_ADMIN ) {
      return ![
        "content-management",
        "location-management",
        "franchise-management",
        "service-management",
        "settings"
      ].includes(key);
    }

    if( role === UserRole.EMPLOYEE){
      return ![
        "content-management",
        "location-management",
        "franchise-management",
        "service-management",
        "my-franchise",
        "financials",
        "expenses-management",
        "settings"
      ].includes(key);
    }

    // Default behavior (if role missing / legacy sessions)
    return true;
  });

  const handleLogoutClick = async (event: React.MouseEvent<HTMLAnchorElement>, key: string) => {
    if (key === "logout") {
      event.preventDefault();
      openConfirmDialog(
        "Are you sure you want to logout? ",
        "Logout",
        "Cancel",
        async () => {
          const role = getLocalStorage(AppConstant.userRole);
          const isMockSession =
            role === UserRole.FRANCHISE_ADMIN || role === UserRole.EMPLOYEE;
          const isAdmin = getLocalStorage(AppConstant.isAdmin);
          const response = isMockSession ? true : await logout();
          if (response) {
            clearLocalStorage();
            setLocalStorage(AppConstant.isAdmin, isAdmin);
            navigate(ROUTES.LOGIN.path, { replace: true });
          }
        });
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
              <li key={key || label} className={clsx({ active: isActive(path) })}>
                <NavLink to={path} className={({ isActive }) => (isActive ? "sidebar-active" : "")}>
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