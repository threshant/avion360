"use client";

// Shimmer card for skeleton loading
export function ShimmerCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-2 h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mb-2 h-7 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-14 w-14 animate-pulse rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

// Shimmer badge for channel items
export function ShimmerChannelBadge() {
  return (
    <article className="text-center">
      <div className="mx-auto h-20 w-20 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-3 h-4 w-20 animate-pulse rounded bg-slate-200 mx-auto" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-16 animate-pulse rounded bg-slate-200 mx-auto" />
        <div className="h-5 w-12 animate-pulse rounded bg-slate-200 mx-auto" />
      </div>
    </article>
  );
}

// Shimmer for summary cards (Turnover, Invoicing, Warehouse)
export function ShimmerSummaryCard() {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mt-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </article>
  );
}

// Shimmer for lead sources section
export function ShimmerLeadSources() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-200" />
      </div>
      <div className="grid grid-cols-2 gap-y-6 text-center sm:grid-cols-3 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <ShimmerChannelBadge key={i} />
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 py-5 text-center">
        <div className="mx-auto h-6 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mx-auto mt-2 h-8 w-24 animate-pulse rounded bg-slate-200" />
      </div>
    </section>
  );
}

// Shimmer for section header with title only
export function ShimmerSectionHeader() {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
    </div>
  );
}
