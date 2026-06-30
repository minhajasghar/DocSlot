"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

interface Doctor {
  id: number;
  name: string;
  email: string;
  specialization: string;
}

interface AuthContextType {
  doctor: Doctor | null;
  token: string | null;
  login: (token: string, doctor: Doctor) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  doctor: null,
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedDoctor = localStorage.getItem("doctor");
    if (storedToken && storedDoctor) {
      try {
        setToken(storedToken);
        setDoctor(JSON.parse(storedDoctor));
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("doctor");
      }
    }
    setIsLoading(false);
  }, []);

  const loginFn = useCallback((newToken: string, newDoctor: Doctor) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("doctor", JSON.stringify(newDoctor));
    setToken(newToken);
    setDoctor(newDoctor);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("doctor");
    setToken(null);
    setDoctor(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        doctor,
        token,
        login: loginFn,
        logout,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
