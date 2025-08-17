import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { AuthStatusResponse } from "@shared/types";

interface AuthContextType {
  isAuthenticated: boolean;
  authEnabled: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/status", {
        credentials: "include",
      });
      
      if (response.ok) {
        const data: AuthStatusResponse = await response.json();
        setIsAuthenticated(data.authenticated);
        setAuthEnabled(data.authEnabled);
      } else {
        setIsAuthenticated(false);
        setAuthEnabled(true); // Assume auth is enabled if status check fails
      }
    } catch (error) {
      console.error("Failed to check auth status:", error);
      setIsAuthenticated(false);
      setAuthEnabled(true);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (data.success) {
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { 
        success: false, 
        error: "Network error. Please try again." 
      };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const contextValue: AuthContextType = {
    isAuthenticated,
    authEnabled,
    loading,
    login,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}