"use client";

import { swrKey, withNetworkActivity } from "@/lib/swr-client";
import { api } from "@/services/apiClient";
import useSWR from "swr";

type FinancialReportsPayload = {
  summary: {
    totalIncome: number;
    totalExpense: number;
    totalCommission: number;
    netProfit: number;
    arTotal: number;
    overdueAR: number;
  } | null;
  pl: {
    months: string[];
    monthlyData: Record<
      string,
      { income: number; expense: number; commission: number }
    >;
    totals: {
      totalIncome: number;
      totalExpense: number;
      totalCommission: number;
      netProfit: number;
    };
    margin: string;
  } | null;
  cashflow: {
    months: string[];
    inflow: Record<string, number>;
    outflow: Record<string, number>;
    netFlow: { month: string; inflow: number; outflow: number; net: number }[];
  } | null;
};

export function useFinancialReports(fromMonth: string, toMonth: string) {
  const key = swrKey("/swr/financial-reports", { fromMonth, toMonth });

  const query = useSWR(key, async () =>
    withNetworkActivity(async () => {
      const params = `from=${fromMonth}&to=${toMonth}`;
      const [summary, pl, cashflow] = await Promise.all([
        api.get<FinancialReportsPayload["summary"]>(
          `/api/financial-reports?type=summary&${params}`,
        ),
        api.get<FinancialReportsPayload["pl"]>(
          `/api/financial-reports?type=pl&${params}`,
        ),
        api.get<FinancialReportsPayload["cashflow"]>(
          `/api/financial-reports?type=cashflow&${params}`,
        ),
      ]);

      return { summary, pl, cashflow };
    }),
  );

  return {
    summary: query.data?.summary ?? null,
    plData: query.data?.pl ?? null,
    cashFlow: query.data?.cashflow ?? null,
    isLoading: query.isLoading || query.isValidating,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.mutate,
  };
}
