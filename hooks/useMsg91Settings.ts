"use client";

import { invalidateSWRPrefix, withNetworkActivity } from "@/lib/swr-client";
import { useCallback, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

export type Msg91Settings = {
  authKey: string;
  templateId: string;
  otpLength: string;
  otpExpiry: string;
};

type UseMsg91SettingsState = {
  settings: Msg91Settings;
  loading: boolean;
  error: string | null;
  saved: boolean;
};

const DEFAULTS: Msg91Settings = {
  authKey: "",
  templateId: "",
  otpLength: "6",
  otpExpiry: "5",
};

export function useMsg91Settings() {
  const [saved, setSaved] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const { mutate: globalMutate } = useSWRConfig();

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<Msg91Settings>("/swr/settings/msg91", () =>
      withNetworkActivity(async () => {
        const keys = [
          "MSG91_AUTH_KEY",
          "MSG91_TEMPLATE_ID",
          "MSG91_OTP_LENGTH",
          "MSG91_OTP_EXPIRY",
        ] as const;

        const responses = await Promise.all(
          keys.map((key) => fetch(`/api/settings/msg91?key=${key}`)),
        );
        const payloads = await Promise.all(responses.map((r) => r.json()));

        return {
          authKey: payloads[0]?.data?.value ?? "",
          templateId: payloads[1]?.data?.value ?? "",
          otpLength: payloads[2]?.data?.value ?? "6",
          otpExpiry: payloads[3]?.data?.value ?? "5",
        };
      }),
    );

  const updateSetting = useCallback(
    async (key: keyof Msg91Settings, value: string): Promise<boolean> => {
      const dbKeyMap: Record<keyof Msg91Settings, string> = {
        authKey: "MSG91_AUTH_KEY",
        templateId: "MSG91_TEMPLATE_ID",
        otpLength: "MSG91_OTP_LENGTH",
        otpExpiry: "MSG91_OTP_EXPIRY",
      };

      try {
        setMutationError(null);
        const response = await withNetworkActivity(() =>
          fetch("/api/settings/msg91", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: dbKeyMap[key], value }),
          }),
        );

        if (!response.ok) {
          throw new Error(`Failed to update ${key}`);
        }

        await mutate(
          (current) => ({ ...(current ?? DEFAULTS), [key]: value }),
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

  const state: UseMsg91SettingsState = {
    settings: data ?? DEFAULTS,
    loading: isLoading || isValidating,
    error: mutationError || (error instanceof Error ? error.message : null),
    saved,
  };

  return {
    ...state,
    updateSetting,
  };
}
