"use client";

import { api } from "@/services/apiClient";
import type { Key } from "swr";
import type { ScopedMutator } from "swr/_internal";

let pendingRequests = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function beginRequest() {
  pendingRequests += 1;
  notify();
}

function endRequest() {
  pendingRequests = Math.max(0, pendingRequests - 1);
  notify();
}

export async function withNetworkActivity<T>(
  operation: () => Promise<T>,
): Promise<T> {
  beginRequest();
  try {
    return await operation();
  } finally {
    endRequest();
  }
}

export function subscribeNetworkActivity(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getNetworkActivitySnapshot() {
  return pendingRequests;
}

export const swrFetcher = async (key: Key) => {
  if (typeof key === "string") {
    return withNetworkActivity(() => api.get(key));
  }

  throw new Error("SWR fetcher requires a string URL key");
};

export function swrKey(path: string, params?: Record<string, unknown>) {
  if (!params || Object.keys(params).length === 0) return path;

  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    query.set(k, String(v));
  });

  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function invalidateSWRPrefix(
  mutate: ScopedMutator,
  prefixes: string | string[],
) {
  const prefixList = Array.isArray(prefixes) ? prefixes : [prefixes];
  await Promise.all(
    prefixList.map((prefix) =>
      mutate(
        (key) => typeof key === "string" && key.startsWith(prefix),
        undefined,
        { revalidate: true },
      ),
    ),
  );
}
