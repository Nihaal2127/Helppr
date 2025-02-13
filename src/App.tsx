import React, { useEffect, useState, Suspense, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Container } from "react-bootstrap";
import AppRoutes from "./routes/AppRoutes";
import { getLocalStorage } from "./helper/localStorageHelper";
import { AppConstant } from "./constant/AppConstant";
import { useViewport } from "./helper/useViewPort";
import { ROUTES } from "./routes/Routes";
import { ToastContainer } from "react-toastify";
import Sidebar from "./layout/Sidebar";
import "react-toastify/dist/ReactToastify.css";
import "./assets/scss/App.scss";
import "./assets/scss/loader.scss";
import "./assets/scss/Sidebar.scss";
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const { width } = useViewport();
  const location = useLocation();
  const navigate = useNavigate();
  const is404Page = location.pathname === "/404";
  const isAuthRoute = location.pathname.includes("/auth");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getLocalStorage(AppConstant.authToken));

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

  // useEffect(() => {
  //   if (location.pathname.startsWith("/auth")) {
  //     document.body.style.overflow = "hidden";
  //   } else {
  //     document.body.style.overflow = "auto";
  //     window.scrollTo(0, 0);
  //   }
  // }, [location.pathname]);

  useEffect(() => {
    const token = getLocalStorage(AppConstant.authToken);
    //console.log("App Token:",token)
    if (token) {
      setIsAuthenticated(true);
      if (location.pathname === ROUTES.LOGIN.path) {
        navigate(ROUTES.DASHBOARD.path, { replace: true });
      }
    } else {
      setIsAuthenticated(false);
      if (!location.pathname.startsWith("/auth")) {
        navigate(ROUTES.LOGIN.path, { replace: true });
      }
    }
  }, [location.pathname, navigate]);
  return (

    <div className={`custom-app-layout ${!isAuthRoute && !is404Page ? "with-sidebar" : "without-sidebar"}`}>
      {!isAuthRoute && !is404Page && (
        <aside className="sidebar">
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
