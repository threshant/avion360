"use client";

import { swrFetcher } from "@/lib/swr-client";
import { SWRConfig } from "swr";

export default function AppSWRProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        revalidateOnMount: undefined,
        keepPreviousData: true,
        shouldRetryOnError: false,
        dedupingInterval: 30000,
        focusThrottleInterval: 30000,
        loadingTimeout: 12000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
