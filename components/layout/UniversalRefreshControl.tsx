"use client";

import {
  getNetworkActivitySnapshot,
  subscribeNetworkActivity,
} from "@/lib/swr-client";
import { RefreshCw } from "lucide-react";
import { useSyncExternalStore, useTransition } from "react";
import { useSWRConfig } from "swr";

export default function UniversalRefreshControl() {
  const { mutate } = useSWRConfig();
  const [isRefreshing, startRefresh] = useTransition();
  const pendingNetworkRequests = useSyncExternalStore(
    subscribeNetworkActivity,
    getNetworkActivitySnapshot,
    () => 0,
  );

  const isLoading = isRefreshing || pendingNetworkRequests > 0;

  const refreshAll = () => {
    startRefresh(async () => {
      await mutate(() => true, undefined, {
        revalidate: true,
      });
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={refreshAll}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-xl border border-[#FDDDD6] bg-white px-2 py-2 text-sm font-semibold text-[#FF6B4A] shadow-sm transition hover:bg-[#FFF1EE] disabled:cursor-not-allowed disabled:opacity-60 sm:px-3"
        title="Refresh all cached data"
      >
        <RefreshCw
          className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">Refresh</span>
      </button>
    </div>
  );
}
