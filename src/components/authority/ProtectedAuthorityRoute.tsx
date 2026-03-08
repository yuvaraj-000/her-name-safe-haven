import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthority } from "@/contexts/AuthorityContext";

const ProtectedAuthorityRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthority } = useAuthority();

  if (!isAuthority) {
    return <Navigate to="/authority" replace />;
  }

  return <>{children}</>;
};

export default ProtectedAuthorityRoute;
