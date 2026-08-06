"use client";

import { invalidateSWRPrefix, withNetworkActivity } from "@/lib/swr-client";
import { api } from "@/services/apiClient";
import useSWR, { useSWRConfig } from "swr";

type ProfileData = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
};

type PreferencesData = {
  emailNotif: boolean;
  wpNotif: boolean;
  callNotif: boolean;
  leadNotif: boolean;
  theme: "Light" | "Dark" | "System";
  compactMode: boolean;
  language: string;
  webhookUrl: string;
};

export function useUserSettings() {
  const { mutate: globalMutate } = useSWRConfig();

  const profile = useSWR("/swr/settings/profile", () =>
    withNetworkActivity(() =>
      api.get<{ data: ProfileData }>("/api/settings/profile"),
    ),
  );

  const prefs = useSWR("/swr/settings/preferences", () =>
    withNetworkActivity(() =>
      api.get<{ data: PreferencesData }>("/api/settings/preferences"),
    ),
  );

  const apiKey = useSWR("/swr/settings/api-key", () =>
    withNetworkActivity(() =>
      api.get<{ data: { apiKey: string } }>("/api/settings/api-key"),
    ),
  );

  const saveProfile = async (payload: {
    name: string;
    phone?: string;
    department?: string;
  }) => {
    await withNetworkActivity(() => api.put("/api/settings/profile", payload));
    await invalidateSWRPrefix(globalMutate, "/swr/settings/profile");
  };

  const savePreferences = async (payload: PreferencesData) => {
    await withNetworkActivity(() =>
      api.put("/api/settings/preferences", payload),
    );
    await invalidateSWRPrefix(globalMutate, "/swr/settings/preferences");
  };

  const regenerateApiKey = async () => {
    await withNetworkActivity(() =>
      api.post("/api/settings/api-key", { regenerate: true }),
    );
    await invalidateSWRPrefix(globalMutate, "/swr/settings/api-key");
  };

  return {
    profile: profile.data?.data ?? null,
    preferences: prefs.data?.data ?? null,
    apiKey: apiKey.data?.data?.apiKey ?? "",
    loading:
      profile.isLoading ||
      profile.isValidating ||
      prefs.isLoading ||
      prefs.isValidating ||
      apiKey.isLoading ||
      apiKey.isValidating,
    error:
      (profile.error instanceof Error && profile.error.message) ||
      (prefs.error instanceof Error && prefs.error.message) ||
      (apiKey.error instanceof Error && apiKey.error.message) ||
      null,
    saveProfile,
    savePreferences,
    regenerateApiKey,
  };
}
