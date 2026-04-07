import { createContext, useContext, useState, ReactNode } from "react";

interface AuthorityContextType {
  isAuthority: boolean;
  authorityLogin: (code: string) => boolean;
  authorityLogout: () => void;
}

const AuthorityContext = createContext<AuthorityContextType>({
  isAuthority: false,
  authorityLogin: () => false,
  authorityLogout: () => {},
});

export const useAuthority = () => useContext(AuthorityContext);

const AUTHORITY_CODE = "HERNET143";

export const AuthorityProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthority, setIsAuthority] = useState(() => {
    return localStorage.getItem("authority_session") === "active";
  });

  const authorityLogin = (code: string): boolean => {
    if (code === AUTHORITY_CODE) {
      setIsAuthority(true);
      localStorage.setItem("authority_session", "active");
      return true;
    }
    return false;
  };

  const authorityLogout = () => {
    setIsAuthority(false);
    sessionStorage.removeItem("authority_session");
  };

  return (
    <AuthorityContext.Provider value={{ isAuthority, authorityLogin, authorityLogout }}>
      {children}
    </AuthorityContext.Provider>
  );
};
