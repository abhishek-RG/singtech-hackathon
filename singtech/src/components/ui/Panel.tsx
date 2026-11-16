import type { ReactNode } from "react";

// One clear window per block: a soft white card on the light canvas, never nested. agentId lets the SingTech AI cursor find it.
export function Panel({ title, action, children, className = "", bodyClassName = "p-4", agentId, id }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string; agentId?: string; id?: string }) {
  return (
    <section id={id} data-agent={agentId} className={`st-card flex min-w-0 flex-col overflow-hidden ${className}`}>
      <header className="flex min-h-[50px] flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[#eef0f4] px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold text-primary">
          <span aria-hidden className="h-3.5 w-[3px] rounded-full bg-st-red" />
          {title}
        </h2>
        {action}
      </header>
      <div className={`min-w-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

// KPI strip: one bordered panel split into cells, instead of a row of separate cards.
export function KpiStrip({ items }: { items: { label: string; value: ReactNode; note?: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 rounded-[10px] border border-st-line bg-white md:grid-cols-4 [&>div]:border-st-line max-md:[&>div:nth-child(-n+2)]:border-b md:[&>div:not(:first-child)]:border-l max-md:[&>div:nth-child(even)]:border-l">
      {items.map((k) => (
        <div key={k.label} className="min-w-0 px-4 py-3">
          <dt className="truncate text-[12px] text-secondary">{k.label}</dt>
          <dd className="tabular mt-1 text-[22px] leading-tight font-semibold text-primary">{k.value}</dd>
          {k.note && <dd className="mt-1 truncate text-[12px] text-secondary">{k.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

// Page header on the light canvas (next-shadcn style): title, one line of purpose, actions on the right, then KPI cards.
export function PageHero({ title, subtitle, actions, leading, children }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; tone?: "ink" | "red"; leading?: ReactNode; children?: ReactNode }) {
  return (
    <section data-agent="page-hero" className="pt-1">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {leading}
          <div className="min-w-0">
            <h1 className="text-[24px] leading-tight font-bold tracking-[-0.01em] text-primary">{title}</h1>
            {subtitle && <div className="mt-1 max-w-[80ch] text-[13px] text-secondary">{subtitle}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

// KPI cards (Horizon): a label, a large figure, one line of meaning. Same props as before so every page keeps working.
export function GlassStats({ items, columns = 4 }: { items: { label: string; value: ReactNode; note?: ReactNode }[]; columns?: 3 | 4 | 5 | 6 }) {
  const cols = { 3: "md:grid-cols-3", 4: "md:grid-cols-4", 5: "md:grid-cols-5", 6: "md:grid-cols-3 xl:grid-cols-6" }[columns];
  return (
    <dl className={`grid grid-cols-2 gap-3 ${cols}`}>
      {items.map((k) => (
        <div key={k.label} className="st-card min-w-0 px-4 py-3.5">
          <dt className="flex items-center gap-1.5 truncate text-[12px] font-medium text-secondary">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-st-red" />
            {k.label}
          </dt>
          <dd className={`tabular mt-1.5 leading-tight font-bold break-words text-primary ${columns >= 5 ? "text-[19px]" : "text-[24px]"}`} title={typeof k.value === "string" ? k.value : undefined}>
            {k.value}
          </dd>
          {k.note && <dd className="mt-1 truncate text-[12px] text-secondary">{k.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[22px] leading-tight font-semibold text-primary">{title}</h1>
        {subtitle && <p className="mt-1 max-w-[80ch] text-[13px] text-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// Sentence case, body face, one step smaller: no tracked capitals.
export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-[13px] font-semibold text-primary">{children}</h3>;
}

// Status dot always paired with its word (CLAUDE.md section 2).
export function StatusWord({ tone, children }: { tone: "verified" | "warning" | "critical" | "info" | "neutral"; children: ReactNode }) {
  const dot = { verified: "bg-[#059669]", warning: "bg-[#D97706]", critical: "bg-st-red", info: "bg-[#2563EB]", neutral: "bg-[#8A8F9C]" }[tone];
  const ink = { verified: "text-st-verified", warning: "text-st-warning", critical: "text-st-red-ink", info: "text-primary", neutral: "text-secondary" }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] whitespace-nowrap ${ink}`}>
      <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${dot}`} />
      {children}
    </span>
  );
}
