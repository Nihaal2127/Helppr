import React from "react";

const Login = React.lazy(() => import("../pages/auth/Login"));
const ForgotPassword = React.lazy(() => import("../pages/auth/ForgotPassword"));
const Dashboard = React.lazy(() => import("../pages/dashboard"));
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