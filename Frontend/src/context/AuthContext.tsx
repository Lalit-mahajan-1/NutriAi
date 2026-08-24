import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi, userApi, UserProfile } from "@/lib/api";

interface User {
  _id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateUser: (data: Partial<UserProfile>) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("nutrisight_token");
    const storedUser = localStorage.getItem("nutrisight_user");
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("nutrisight_token");
        localStorage.removeItem("nutrisight_user");
      }
    }
    setLoading(false);
  }, []);

  // Fetch full profile when user is set
  useEffect(() => {
    if (user && token) {
      userApi.getProfile().then(setProfile).catch(() => {});
    }
  }, [user, token]);

  const saveSession = (userData: User, jwtToken: string) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem("nutrisight_token", jwtToken);
    localStorage.setItem("nutrisight_user", JSON.stringify(userData));
  };

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    const { token: jwt, ...userInfo } = data;
    saveSession(userInfo, jwt);
  };

  const signup = async (name: string, email: string, password: string) => {
    const data = await authApi.signup(name, email, password);
    const { token: jwt, ...userInfo } = data;
    saveSession(userInfo, jwt);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setProfile(null);
    localStorage.removeItem("nutrisight_token");
    localStorage.removeItem("nutrisight_user");
  };

  const refreshProfile = async () => {
    if (!user) return;
    const p = await userApi.getProfile();
    setProfile(p);
    // Keep user name in sync
    setUser((prev) => prev ? { ...prev, name: p.name } : prev);
    localStorage.setItem("nutrisight_user", JSON.stringify({ ...user, name: p.name }));
  };

  const updateUser = async (data: Partial<UserProfile>) => {
    const updated = await userApi.updateProfile(data);
    setProfile(updated);
    setUser((prev) => prev ? { ...prev, name: updated.name } : prev);
    localStorage.setItem("nutrisight_user", JSON.stringify({ ...user, name: updated.name }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        loading,
        login,
        signup,
        logout,
        refreshProfile,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
