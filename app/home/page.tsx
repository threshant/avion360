"use client";

import PageHeader from "@/components/PageHeader";
import CrmShell from "@/components/layout/CrmShell";
import { useAviontiveLeads } from "@/hooks/useAviontiveLeads";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";

export default function HomePage() {
  const { leads, loading, error, refetch } = useAviontiveLeads();
  const { dashboardData, loading: analyticsLoading } = useDashboardAnalytics();

  return (
    <CrmShell activeNav="Dashboard">
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader title="Welcome to Avion360" subtitle="Here's a quick overview of your recent leads from Aviontive" onRefresh={refetch} />

        {/* Leads Count Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-6">
            <p className="text-xs font-semibold text-slate-500 uppercase">
              Total Leads
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {loading ? "—" : leads.length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-6">
            <p className="text-xs font-semibold text-slate-500 uppercase">
              Status
            </p>
            <p className="mt-2 text-lg font-semibold text-emerald-600">
              {error ? "Error loading" : "Connected"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-6">
            <p className="text-xs font-semibold text-slate-500 uppercase">
              Source
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-700">
              Aviontive API
            </p>
          </div>
        </div>

        {/* Channels Breakdown Section */}
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Channels Breakdown
          </h2>

          {analyticsLoading && (
            <div className="text-center py-6">
              <p className="text-slate-500">Loading channels data...</p>
            </div>
          )}

          {!analyticsLoading && dashboardData?.channels && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {dashboardData.channels.map((channel: any) => (
                <div
                  key={channel.channelId}
                  className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 hover:shadow-sm transition-shadow"
                >
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    {channel.channelName}
                  </p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">
                        Conversations
                      </span>
                      <span className="text-lg font-bold text-sky-600">
                        {channel.conversations}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Leads</span>
                      <span className="text-lg font-bold text-emerald-600">
                        {channel.leads}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Latest Leads Section */}
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Latest Leads
            </h2>
            <button
              onClick={refetch}
              disabled={loading}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              ⚠️ {error}
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <p className="text-slate-500">Loading leads from Aviontive...</p>
            </div>
          )}

          {!loading && !error && leads.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-500">
                No leads found. Check your Aviontive API credentials.
              </p>
            </div>
          )}

          {!loading && !error && leads.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0, 10).map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {lead.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <span className="inline-block px-2 py-1 bg-sky-50 text-sky-700 rounded text-xs font-medium">
                          {lead.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {lead.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {lead.phone}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium border ${lead.statusColor}`}
                        >
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </CrmShell>
  );
}
