import { ROUTES } from "../routes/Routes";
import menuProfile from "../assets/icons/menu-profile.svg";
import menuLogout from "../assets/icons/menu-logout.svg";

export const profileMenuItems = [
    { key: "profile", path: ROUTES.PROFILE.path, label: "Profile", icon: menuProfile },
    { key: "logout", path: "", label: "Logout", icon: menuLogout },
];

export const mainMenuItems = [
    {
        key: "dashboards",
        label: "Dashboard",
        path: ROUTES.DASHBOARD.path,
    },
    { path: "/admin/service-management", label: "Service Management" },
    { path: "/admin/user-management", label: "User Management" },
    { path: "/order-management", label: "Order Management" },
    { path: "/financials", label: "Financials" },
    { path: "/reports", label: "Reports & Analytics" },
    { path: "/settings", label: "Settings" },
    { path: "/support", label: "Support Center" },
    { path: "/marketing", label: "Marketing & Promotions" },
    { path: "/notifications", label: "Notifications" },
    { path: "/calendar", label: "Calendar" },

];

