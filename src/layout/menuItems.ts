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
    {
        key: "location-management",
        label: "Location Management",
        path: ROUTES.LOCATION_MANAGEMENT.path,
    },
    {
        key: "service-management",
        label: "Service Management",
        path: ROUTES.SERVICE_MANAGEMENT.path,
    },
    {
        key: "user-management",
        label: "User Management",
        path: ROUTES.USER_MANAGEMENT.path,
    },
    {
        key: "order-management",
        label: "Order Management",
        path: ROUTES.ORDER_MANAGEMENT.path,
    },
    {
        key: "financials",
        label: "Financials",
        path: ROUTES.FINANCIALS.path,
    },
    { path: "/reports", label: "Reports & Analytics" },
    {
        key: "settings",
        label: "Settings",
        path: ROUTES.SETTINGS.path,
    },
    {
        key: "support-center",
        label: "Support Center",
        path: ROUTES.TICKET_MANAGEMENT.path,
    },
    { path: "/marketing", label: "Marketing & Promotions" },
    { path: "/notifications", label: "Notifications" },
    { path: "/calendar", label: "Calendar" },

];

