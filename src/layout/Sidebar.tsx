import React from "react";
import { NavLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { mainMenuItems, profileMenuItems } from "./menuItems";
import { showSuccessAlert } from "../helper/alertHelper";
import { clearLocalStorage, getLocalStorage, setLocalStorage } from "../helper/localStorageHelper";
import { AppConstant } from "../constant/AppConstant";
import { logout } from "../services/adminService";
import { ROUTES } from "../routes/Routes";
import { openConfirmDialog } from "../components/CustomConfirmDialog";

const Sidebar: React.FC = () => {
  const navigate = useNavigate();

  const handleLogoutClick = async (event: React.MouseEvent<HTMLAnchorElement>, key: string) => {
    if (key === "logout") {
      event.preventDefault();
      openConfirmDialog(
        "Are you sure you want to logout? ",
        "Logout",
        "Cancle",
        async () => {
          let isAdmin = getLocalStorage(AppConstant.isAdmin);
          let response = isAdmin === "true" ? await logout() : await logout();
          if (response) {
            clearLocalStorage();
            setLocalStorage(AppConstant.isAdmin, isAdmin);
            navigate(ROUTES.LOGIN.path, { replace: true });
          }
        });
    }
  };

  return (
    <nav id="sidebar" className="sidebar">
      <h1>helper!</h1>

      {/* <div className="custom-menu">
        <button type="button" id="sidebarCollapse" className="btn">
          <i className="fa fa-bars"></i>
          <span className="sr-only">Toggle Menu</span>
        </button>
      </div> */}

      <div className="p-4 pt-5">
        <ul className="list-unstyled components mb-5" id="nav-links">
          {mainMenuItems.map(({ key, path, label }) => (
            <li key={key}>
              <NavLink to={path} className={({ isActive }) => (isActive ? "sidebar-active" : "")}>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <ul className="list-unstyled components mb-2">
          {profileMenuItems.map(({ key, path, label, icon }) => (
            <li key={key}>
              <NavLink to={path} onClick={(e) => handleLogoutClick(e, key)}>
                <img src={icon} alt={label} className="menu-icon" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Sidebar;
