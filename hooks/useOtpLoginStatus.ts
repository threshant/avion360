"use client";

import { withNetworkActivity } from "@/lib/swr-client";
import {
  fetchOtpLoginStatus,
  type OtpLoginStatus,
} from "@/services/authService";
import useSWR from "swr";

export function useOtpLoginStatus(enabled = true) {
  const query = useSWR<OtpLoginStatus>(
    enabled ? "/swr/auth/otp-login-status" : null,
    () => withNetworkActivity(() => fetchOtpLoginStatus()),
  );

  return {
    otpLoginStatus: query.data ?? null,
    loading: query.isLoading || query.isValidating,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.mutate,
  };
}
