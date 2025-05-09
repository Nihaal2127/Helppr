import React from "react";

const Login = React.lazy(() => import("../pages/auth/Login"));
const ForgotPassword = React.lazy(() => import("../pages/auth/ForgotPassword"));
const Dashboard = React.lazy(() => import("../pages/dashboard"));
const Profile = React.lazy(() => import("../pages/profile"));
const LocationManagement = React.lazy(() => import("../pages/locationManagement"));
const ServiceManagement = React.lazy(() => import("../pages/serviceManagement"));
const UserManagement = React.lazy(() => import("../pages/userManagement"));
const OrderManagement = React.lazy(() => import("../pages/orderManagement"));
const Settings = React.lazy(() => import("../pages/settings"));
const Role = React.lazy(() => import("../pages/settings/role"));
const TaxOtherCharges = React.lazy(() => import("../pages/settings/taxOtherCharges"));
const Financials = React.lazy(() => import("../pages/financial"));
const OrderPayments = React.lazy(() => import("../pages/financial/orderPayments"));
const PartnerPayments = React.lazy(() => import("../pages/financial/partnerPayments"));
const PartnerPayout = React.lazy(() => import("../pages/financial/partnerPayout"));
const PartnerPayoutShow = React.lazy(() => import("../pages/financial/partnerPayout/show"));
const TicketManagement = React.lazy(() => import("../pages/ticketManagement"));
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
  ORDER_MANAGEMENT: {
    path: "/order-management",
    element: <OrderManagement />,
    isProtected: true,
  },
  FINANCIALS: {
    path: "/financial",
    element: <Financials />,
    isProtected: true,
  },
  ORDER_PAYMENTS: {
    path: "/financial-order-payments",
    element: <OrderPayments />,
    isProtected: true,
  },
  PARTNER_PAYMENTS: {
    path: "/financial-partner-payments",
    element: <PartnerPayments />,
    isProtected: true,
  },
  PARTNER_PAYOUT: {
    path: "/financial-partner-payout",
    element: <PartnerPayout />,
    isProtected: true,
  },
  PARTNER_PAYOUT_SHOW: {
    path: "/financial-partner-payout-show",
    element: <PartnerPayoutShow />,
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
  TAX_OTHER_CHARGES: {
    path: "/settings-tax-other-charges",
    element: <TaxOtherCharges />,
    isProtected: true,
  },
  TICKET_MANAGEMENT: {
    path: "/ticket-management",
    element: <TicketManagement />,
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