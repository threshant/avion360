"use client";

import { invalidateSWRPrefix, withNetworkActivity } from "@/lib/swr-client";
import { useCallback, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

export type AviontiveSettings = {
  apiKey: string;
  brandId: string;
  apiBaseUrl: string;
};

type UseAviontiveSettingsState = {
  settings: AviontiveSettings;
  loading: boolean;
  error: string | null;
  saved: boolean;
};

export function useAviontiveSettings() {
  const [saved, setSaved] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const { mutate: globalMutate } = useSWRConfig();

  const {
    data: settings,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<AviontiveSettings>("/swr/settings/aviontive", () =>
    withNetworkActivity(async () => {
      const [apiKeyRes, brandIdRes, baseUrlRes] = await Promise.all([
        fetch("/api/settings/aviontive?key=AVIONTIVE_API_KEY"),
        fetch("/api/settings/aviontive?key=AVIONTIVE_BRAND_ID"),
        fetch("/api/settings/aviontive?key=AVIONTIVE_API_BASE_URL"),
      ]);

      const apiKeyData = await apiKeyRes.json();
      const brandIdData = await brandIdRes.json();
      const baseUrlData = await baseUrlRes.json();

      return {
        apiKey: apiKeyData.data?.value || "",
        brandId: brandIdData.data?.value || "",
        apiBaseUrl: baseUrlData.data?.value || "https://box.aviontive.com/api",
      };
    }),
  );

  const updateSetting = useCallback(
    async (key: string, value: string): Promise<boolean> => {
      try {
        setMutationError(null);
        const response = await withNetworkActivity(() =>
          fetch("/api/settings/aviontive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: `AVIONTIVE_${key.toUpperCase()}`,
              value,
            }),
          }),
        );

        if (!response.ok) {
          throw new Error(`Failed to update ${key}`);
        }

        await mutate(
          (current) => ({
            ...(current ?? {
              apiKey: "",
              brandId: "",
              apiBaseUrl: "https://box.aviontive.com/api",
            }),
            [key.toLowerCase() === "api_key"
              ? "apiKey"
              : key.toLowerCase() === "brand_id"
                ? "brandId"
                : "apiBaseUrl"]: value,
          }),
          { revalidate: false },
        );
        await invalidateSWRPrefix(globalMutate, "/swr/settings");

        setSaved(true);
        setTimeout(() => {
          setSaved(false);
        }, 2000);

        return true;
      } catch (err) {
        setMutationError(
          err instanceof Error ? err.message : "Failed to update setting",
        );
        return false;
      }
    },
    [globalMutate, mutate],
  );

  const state: UseAviontiveSettingsState = {
    settings: settings ?? {
      apiKey: "",
      brandId: "",
      apiBaseUrl: "https://box.aviontive.com/api",
    },
    loading: isLoading || isValidating,
    error: mutationError || (error instanceof Error ? error.message : null),
    saved,
  };

  return {
    ...state,
    updateSetting,
  };
}
