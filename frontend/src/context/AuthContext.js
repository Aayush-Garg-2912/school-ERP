"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load user from storage or verify with /api/auth/me
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("accessToken");
      const storedUser = localStorage.getItem("erp_user");

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem("erp_user");
        }
      }

      try {
        const { data } = await api.get("/auth/me");
        if (data.success && data.data?.user) {
          const freshUser = {
            id: data.data.user._id,
            name: data.data.user.name,
            email: data.data.user.email,
            role: data.data.user.role?.name || data.data.user.role,
            permissions:
              data.data.user.role?.permissions?.map((p) => p.name) || [],
            school: data.data.user.school,
            teacher: data.data.user.teacher,
            student: data.data.user.student,
            parent: data.data.user.parent,
          };
          setUser(freshUser);
          localStorage.setItem("erp_user", JSON.stringify(freshUser));
        }
      } catch (err) {
        console.error("Auth initialization failed:", err?.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.success) {
      const { accessToken, refreshToken, user: authUser } = data.data;
      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

      const normalizedUser = {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role,
        school: authUser.school,
        teacher: authUser.teacher,
        student: authUser.student,
        parent: authUser.parent,
      };

      setUser(normalizedUser);
      localStorage.setItem("erp_user", JSON.stringify(normalizedUser));
      return normalizedUser;
    }
    throw new Error(data.message || "Login failed");
  };

  const registerChairman = async (formData) => {
    const { data } = await api.post("/auth/register-chairman", formData);
    if (data.success) {
      const { accessToken, refreshToken, chairman, school } = data.data;
      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

      const newUser = {
        id: chairman.id,
        name: chairman.name,
        email: chairman.email,
        role: chairman.role,
        school,
      };

      setUser(newUser);
      localStorage.setItem("erp_user", JSON.stringify(newUser));
      return newUser;
    }
    throw new Error(data.message || "Chairman registration failed");
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Proceed with client logout even if network error
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("erp_user");
      setUser(null);
      router.push("/login");
    }
  };

  const hasRole = (...roles) => {
    if (!user || !user.role) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        registerChairman,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
