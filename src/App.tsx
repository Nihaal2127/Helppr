import React, { useEffect, useState, Suspense } from "react";
import { useLocation, useNavigate, matchPath } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { getLocalStorage } from "./helper/localStorageHelper";
import { AppConstant } from "./constant/AppConstant";
import { useViewport } from "./helper/useViewPort";
import { ROUTES } from "./routes/Routes";
import { ToastContainer } from "react-toastify";
import { requestPermission } from './NotificationService';
import { setNavigate } from "./helper/utility";
import Sidebar from "./layout/Sidebar";
import "react-toastify/dist/ReactToastify.css";
import "./assets/scss/App.scss";
import "./assets/scss/loader.scss";
import "./assets/scss/Sidebar.scss";
import 'bootstrap/dist/css/bootstrap.min.css';
import { routes } from "./routes/Routes";
import "bootstrap-icons/font/bootstrap-icons.css";

function App() {
  const { width } = useViewport();
  const location = useLocation();
  const navigate = useNavigate();
  setNavigate(navigate);
  const is404Page = location.pathname === "/404";
  const is500Page = location.pathname === "/500";
  const isAuthRoute = location.pathname.includes("/auth");
  const [isRouteProtected, setIsRouteProtected] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getLocalStorage(AppConstant.authToken));

  useEffect(() => {
    const fetchPermission = async () => {
      await requestPermission();
    };
    fetchPermission();
  }, []);

  useEffect(() => {
    if (width < 1140) {
      document.body.classList.add("is-mobile");
    } else {
      document.body.classList.remove("is-mobile");
    }
  }, [width]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const token = getLocalStorage(AppConstant.authToken);
    const currentRoute = routes.find((route) =>
      matchPath(route.path, location.pathname)
    );
    const isRouteProtected = currentRoute?.isProtected;
    setIsRouteProtected(isRouteProtected ? isRouteProtected : false);

    if (token) {
      setIsAuthenticated(true);
      if (location.pathname === ROUTES.LOGIN.path) {
        navigate(ROUTES.DASHBOARD.path, { replace: true });
      }
    } else {
      setIsAuthenticated(false);
      if (isRouteProtected) {
        navigate(ROUTES.LOGIN.path, { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  return (

    <div className={`custom-app-layout ${!isAuthRoute && !is404Page && !is500Page && isRouteProtected ? "with-sidebar" : "without-sidebar"}`}>
      {!isAuthRoute && !is404Page && !is500Page && isRouteProtected && (
        <aside className="custom-sidebar">
          <Suspense fallback={null}>
            <Sidebar />
          </Suspense>
        </aside>
      )}

      <main className="custom-content">
        <Suspense fallback={null}>
          <AppRoutes isAuthenticated={isAuthenticated} />
          <ToastContainer />
        </Suspense>
      </main>


    </div>
  );
}

export default App
