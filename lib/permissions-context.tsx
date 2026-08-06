"use client";

import { useAuth } from "@/lib/auth-context";
import type { Permission } from "@/types";
import React, { createContext, useContext } from "react";

interface PermissionsContextType {
  permissions: Permission[];
  loading: boolean;
  error: string | null;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(
  undefined,
);

export function PermissionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { permissions, loading, refreshPermissions } = useAuth();

  return (
    <PermissionsContext.Provider
      value={{ permissions, loading, error: null, refreshPermissions }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsCache() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error(
      "usePermissionsCache must be used within a PermissionsProvider",
    );
  }
  return context;
}
