"use client";

import { ApiError } from "@/services/apiClient";
import {
  fetchCurrentUser as authFetchCurrentUser,
  login as authLogin,
  loginWithToken as authLoginWithToken,
  logout as authLogout,
  signup as authSignup,
  updateProfile as authUpdateProfile,
  verifyOtpLogin as authVerifyOtpLogin,
} from "@/services/authService";
import * as rbacService from "@/services/rbacService";
import {
  fetchTenantMemberships,
  switchTenant as switchTenantService,
  type TenantMembership,
} from "@/services/tenantService";
import type { User } from "@/types/auth";
import type { Permission } from "@/types/rbac";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthContextType {
  user: User | null;
  memberships: TenantMembership[];
  activeTenantId: string | null;
  permissions: Permission[];
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    masterPin: string;
    organizationName?: string;
    planTier?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshPermissions: () => Promise<void>;
  refreshTenants: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  loginWithPhoneOtp: (phone: string, otp: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const clearAuthState = useCallback(() => {
    localStorage.removeItem("auth-token");
    localStorage.removeItem("user-id");
    localStorage.removeItem("user-permissions");
    localStorage.removeItem("tenant-memberships");
    localStorage.removeItem("active-tenant-id");
    document.cookie = "user-id=; Path=/; Max-Age=0; SameSite=Lax";
    document.cookie = "tenant-id=; Path=/; Max-Age=0; SameSite=Lax";
    setUser(null);
    setMemberships([]);
    setActiveTenantId(null);
    setPermissions([]);
  }, []);

  const fetchAndCacheTenants = useCallback(async (signal?: AbortSignal) => {
    try {
      const tenantData = await fetchTenantMemberships();
      if (signal?.aborted) {
        return;
      }
      setMemberships(tenantData.data || []);
      setActiveTenantId(tenantData.activeTenantId || null);
      localStorage.setItem(
        "tenant-memberships",
        JSON.stringify(tenantData.data || []),
      );
      localStorage.setItem("active-tenant-id", tenantData.activeTenantId || "");
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      console.error("Failed to fetch tenant memberships:", error);
      setMemberships([]);
      setActiveTenantId(null);
    }
  }, []);

  // Fetch and cache permissions
  const fetchAndCachePermissions = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await rbacService.getUserPermissions();
      if (signal?.aborted) {
        return;
      }
      setPermissions(data);
      // Cache permissions in localStorage
      localStorage.setItem("user-permissions", JSON.stringify(data));
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      console.error("Failed to fetch permissions:", error);
      setPermissions([]);
    }
  }, []);

  // Initialize auth on app load
  const initializeAuth = useCallback(
    async (signal?: AbortSignal) => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("auth-token")
          : null;
      const hasAuthCookie =
        typeof document !== "undefined" && document.cookie.includes("user-id=");

      if (!token && !hasAuthCookie) {
        clearAuthState();
        setLoading(false);
        return;
      }

      try {
        const userData = await authFetchCurrentUser(signal);
        if (signal?.aborted) {
          return;
        }
        setUser(userData);
        await fetchAndCacheTenants(signal);

        // Try to load cached permissions first
        const cachedPermissions = localStorage.getItem("user-permissions");
        if (cachedPermissions) {
          try {
            if (signal?.aborted) {
              return;
            }
            setPermissions(JSON.parse(cachedPermissions));
          } catch (e) {
            console.error("Failed to parse cached permissions:", e);
            // If cache is invalid, fetch fresh permissions
            await fetchAndCachePermissions(signal);
          }
        } else {
          // If no cache, fetch permissions
          await fetchAndCachePermissions(signal);
        }
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          await authLogout().catch(() => undefined);
          clearAuthState();
          return;
        }

        console.error("Failed to initialize auth:", error);
        clearAuthState();
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [clearAuthState, fetchAndCachePermissions, fetchAndCacheTenants],
  );

  // Initialize auth on app load
  useEffect(() => {
    const token = localStorage.getItem("auth-token");
    const hasAuthCookie =
      typeof document !== "undefined" &&
      (document.cookie.includes("auth-token=") ||
        document.cookie.includes("user-id="));
    const controller = new AbortController();

    if (token || hasAuthCookie) {
      initializeAuth(controller.signal);
    } else {
      setLoading(false);
    }

    return () => {
      controller.abort();
    };
  }, [initializeAuth]);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const result = await authLogin({ email, password });
        localStorage.setItem("auth-token", result.token);
        setUser({ ...result.user, tenantId: result.tenantId ?? null });
        // Log user details to console on successful login
        try {
          console.log("User logged in:", {
            name: result.user?.name ?? null,
            email: result.user?.email ?? null,
          });
        } catch {
          // ignore logging errors
        }

        // Fetch and cache permissions immediately after login
        try {
          await fetchAndCacheTenants();
          await fetchAndCachePermissions();
        } catch {
          // Permissions fetch should not block a successful login
          setPermissions([]);
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Login failed";
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [fetchAndCachePermissions, fetchAndCacheTenants],
  );

  const signup = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
      role: string;
      masterPin: string;
      organizationName?: string;
      planTier?: string;
    }) => {
      setLoading(true);
      try {
        const result = await authSignup(data);
        localStorage.setItem("auth-token", result.token);
        setUser({ ...result.user, tenantId: result.tenantId ?? null });
        // Log user details to console on successful signup
        try {
          console.log("User signed up:", {
            name: result.user?.name ?? null,
            email: result.user?.email ?? null,
          });
        } catch {
          // ignore logging errors
        }
        await fetchAndCacheTenants();
        await fetchAndCachePermissions();
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Signup failed";
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [fetchAndCachePermissions, fetchAndCacheTenants],
  );

  const loginWithToken = useCallback(
    async (token: string) => {
      setLoading(true);
      try {
        const result = await authLoginWithToken(token);
        localStorage.setItem("auth-token", result.token);
        setUser({ ...result.user, tenantId: result.tenantId ?? null });
        await fetchAndCacheTenants();
        await fetchAndCachePermissions();
      } catch (error) {
        console.error("Token login failed:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [fetchAndCachePermissions, fetchAndCacheTenants],
  );

  const loginWithPhoneOtp = useCallback(
    async (phone: string, otp: string) => {
      setLoading(true);
      try {
        const result = await authVerifyOtpLogin(phone, otp);
        localStorage.setItem("auth-token", result.token);
        setUser({ ...result.user, tenantId: result.tenantId ?? null });
        try {
          await fetchAndCacheTenants();
          await fetchAndCachePermissions();
        } catch {
          setPermissions([]);
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "OTP login failed";
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [fetchAndCachePermissions, fetchAndCacheTenants],
  );

  const switchTenant = useCallback(
    async (tenantId: string) => {
      const response = await switchTenantService(tenantId);
      localStorage.setItem("auth-token", response.token);
      setUser({ ...response.user, tenantId: response.tenantId ?? tenantId });
      setActiveTenantId(response.tenantId ?? tenantId);
      await fetchAndCacheTenants();
      await fetchAndCachePermissions();
    },
    [fetchAndCachePermissions, fetchAndCacheTenants],
  );

  const logout = useCallback(async () => {
    try {
      await authLogout();
    } finally {
      clearAuthState();
    }
  }, [clearAuthState]);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    try {
      const updatedUser = await authUpdateProfile(data);
      setUser(updatedUser);
    } catch (error) {
      console.error("Failed to update profile:", error);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        memberships,
        activeTenantId,
        permissions,
        loading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        updateProfile,
        refreshPermissions: fetchAndCachePermissions,
        refreshTenants: fetchAndCacheTenants,
        switchTenant,
        loginWithToken,
        loginWithPhoneOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
