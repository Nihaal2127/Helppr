import React from "react";

const Login = React.lazy(() => import("../pages/auth/Login"));
const ForgotPassword = React.lazy(() => import("../pages/auth/ForgotPassword"));
const Dashboard = React.lazy(() => import("../pages/dashboard"));
const Profile = React.lazy(() => import("../pages/profile"));
const LocationManagement = React.lazy(() => import("../pages/locationManagement"));
const ServiceManagement = React.lazy(() => import("../pages/serviceManagement"));
const UserManagement = React.lazy(() => import("../pages/userManagement"));
const Settings = React.lazy(() => import("../pages/settings"));
const Role = React.lazy(() => import("../pages/settings/role"));
const Error404 = React.lazy(() => import("../pages/Error404"));
const Error500 = React.lazy(() => import("../pages/Error500"));

export const ROUTES = {
  LOGIN: {
    path: "/auth/login",
    element: <Login />,
    isProtected: false,
  },
  FORGOT_PASSWORD: {
    path: "/auth/forgot-password",
    element: <ForgotPassword />,
    isProtected: false,
  },
  DASHBOARD: {
    path: "/dashboard",
    element: <Dashboard />,
    isProtected: true,
  },
  PROFILE: {
    path: "/profile",
    element: <Profile />,
    isProtected: true,
  },
  LOCATION_MANAGEMENT: {
    path: "/location-management",
    element: <LocationManagement />,
    isProtected: true,
  },
  SERVICE_MANAGEMENT: {
    path: "/service-management",
    element: <ServiceManagement />,
    isProtected: true,
  },
  USER_MANAGEMENT: {
    path: "/user-management",
    element: <UserManagement />,
    isProtected: true,
  },
  SETTINGS: {
    path: "/settings",
    element: <Settings />,
    isProtected: true,
  },
  ROLE: {
    path: "/settings-role",
    element: <Role />,
    isProtected: true,
  },
  ERROR404: {
    path: "/404",
    element: <Error404 />,
    isProtected: false,
  },
  ERROR500: {
    path: "/500",
    element: <Error500 />,
    isProtected: false,
  },
}

export const routes = Object.values(ROUTES);