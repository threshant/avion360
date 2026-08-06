"use client";

import {
  getNetworkActivitySnapshot,
  subscribeNetworkActivity,
} from "@/lib/swr-client";
import { useSyncExternalStore } from "react";

export default function UniversalNetworkLoader() {
  const pendingNetworkRequests = useSyncExternalStore(
    subscribeNetworkActivity,
    getNetworkActivitySnapshot,
    () => 0,
  );

  const isVisible = pendingNetworkRequests > 0;

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-0 z-60 transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      aria-live="polite"
      aria-label="Network activity"
    >
      <div className="h-1 w-full overflow-hidden bg-orange-100/70">
          <div className="h-full w-1/3 animate-[network-loader_1.1s_ease-in-out_infinite] bg-linear-to-r from-[#FF6B4A] via-[#FF8266] to-[#e55a39]" />
      </div>
      <style>{`
        @keyframes network-loader {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(420%); }
        }
      `}</style>
    </div>
  );
}
