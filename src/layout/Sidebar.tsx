import React from "react";
import { NavLink } from "react-router-dom";

const Sidebar: React.FC = () => {
  return (
    <nav id="sidebar" className="sidebar">
      <h1>
        <NavLink to="/" className="logo">
          helper!
        </NavLink>
      </h1>

      <div className="custom-menu">
        <button type="button" id="sidebarCollapse" className="btn">
          <i className="fa fa-bars"></i>
          <span className="sr-only">Toggle Menu</span>
        </button>
      </div>

      <div className="p-4 pt-5">
        <ul className="list-unstyled components mb-5" id="nav-links">
          <li>
          <NavLink to="/" className={({ isActive }) => (isActive ? "sidebar-active" : "")}>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/service-management" className={({ isActive }) => (isActive ? "sidebar-active" : "")}>
              Service Management
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/user-management" className={({ isActive }) => (isActive ? "sidebar-active" : "")}>
              User Management
            </NavLink>
          </li>
          <li>
            <NavLink to="/order-management">Order Management</NavLink>
          </li>
          <li>
            <NavLink to="/financials">Financials</NavLink>
          </li>
          <li>
            <NavLink to="/reports">Reports & Analytics</NavLink>
          </li>
          <li>
            <NavLink to="/settings">Settings</NavLink>
          </li>
          <li>
            <NavLink to="/support">Support Center</NavLink>
          </li>
          <li>
            <NavLink to="/marketing">Marketing & Promotions</NavLink>
          </li>
          <li>
            <NavLink to="/notifications">Notifications</NavLink>
          </li>
          <li>
            <NavLink to="/calendar">Calendar</NavLink>
          </li>
        </ul>

        <ul className="list-unstyled components mb-5">
          <li>
            <NavLink to="/profile">
              <img src="/assets/icons/menu-profile.svg" alt="Profile" className="menu-icon" />
              Profile
            </NavLink>
          </li>
          <li>
            <NavLink to="/logout">
              <img src="/assets/icons/menu-logout.svg" alt="Logout" className="menu-icon" />
              Logout
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Sidebar;
