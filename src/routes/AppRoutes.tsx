import { Routes, Route, Navigate } from "react-router-dom";
import { routes, ROUTES } from "./Routes";

const AppRoutes = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={ROUTES.DASHBOARD.path} replace />
          ) : (
            <Navigate to={ROUTES.LOGIN.path} replace />
          )
        }
      />

      {routes.map((route, idx) => (
        <Route
          key={idx}
          path={route.path}
          element={
            route.isProtected && !isAuthenticated ? (
              <Navigate to={ROUTES.LOGIN.path} replace />
            ) : (
              route.element
            )
          }
        />
      ))}

      <Route path="*" element={<Navigate to={ROUTES.ERROR404.path} replace />} />
    </Routes>
  );
};

export default AppRoutes;
