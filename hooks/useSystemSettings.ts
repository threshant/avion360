"use client";

import { invalidateSWRPrefix, withNetworkActivity } from "@/lib/swr-client";
import { api } from "@/services/apiClient";
import useSWR, { useSWRConfig } from "swr";

type CreditFlowResponse = { enabled: boolean };
type OtpLoginResponse = { enabled: boolean; configured?: boolean };

export function useSystemSettings() {
  const { mutate: globalMutate } = useSWRConfig();

  const creditFlow = useSWR("/swr/settings/credit-flow", () =>
    withNetworkActivity(() =>
      api.get<CreditFlowResponse>("/api/settings/credit-flow"),
    ),
  );

  const otpLogin = useSWR("/swr/settings/otp-login", () =>
    withNetworkActivity(() =>
      api.get<OtpLoginResponse>("/api/settings/otp-login"),
    ),
  );

  const updateCreditFlow = async (enabled: boolean) => {
    await withNetworkActivity(() =>
      api.put<CreditFlowResponse>("/api/settings/credit-flow", { enabled }),
    );
    await invalidateSWRPrefix(globalMutate, "/swr/settings");
  };

  const updateOtpLogin = async (enabled: boolean) => {
    await withNetworkActivity(() =>
      api.put<OtpLoginResponse>("/api/settings/otp-login", { enabled }),
    );
    await invalidateSWRPrefix(globalMutate, "/swr/settings");
  };

  return {
    creditFlowEnabled: creditFlow.data?.enabled ?? true,
    otpLoginEnabled: otpLogin.data?.enabled ?? false,
    otpLoginConfigured: otpLogin.data?.configured ?? false,
    loading:
      creditFlow.isLoading ||
      creditFlow.isValidating ||
      otpLogin.isLoading ||
      otpLogin.isValidating,
    error:
      (creditFlow.error instanceof Error && creditFlow.error.message) ||
      (otpLogin.error instanceof Error && otpLogin.error.message) ||
      null,
    updateCreditFlow,
    updateOtpLogin,
    refetch: async () => {
      await Promise.all([creditFlow.mutate(), otpLogin.mutate()]);
    },
  };
}
