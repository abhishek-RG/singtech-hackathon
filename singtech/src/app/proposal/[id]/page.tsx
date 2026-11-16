import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomerLines } from "@/components/proposal/CustomerLines";
import { ProposalUtilities } from "@/components/proposal/ProposalUtilities";
import { RoiSandbox } from "@/components/proposal/RoiSandbox";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { getCompanies, getCompany, getRegulation } from "@/lib/data-service";
import { formatSgd } from "@/lib/format";
import { getAccountHistory } from "@/lib/history";
import { BrandLockup } from "@/components/ui/BrandLockup";

export const generateStaticParams = () => getCompanies().map((c) => ({ id: c.id }));

export async function generateMetadata({ params }: PageProps<"/proposal/[id]">): Promise<Metadata> {
  const company = getCompany((await params).id);
  return { title: company ? `${company.companyName} | Singtel proposal` : "Proposal not found" };
}

// Local copy: constants exported from client modules arrive in server components as references, not values.
const NET_LABEL = { "on-net": "on-net", "near-net": "near-net", "off-net": "off-net" } as const;

const NEXT_STEPS = [
  { title: "Discovery workshop", detail: "Confirm sites, traffic, and compliance scope with your engineers." },
  { title: "Solution design", detail: "Singtel architects return a design and a firm quote." },
  { title: "14-day sandbox pilot", detail: "Prove the improvement on your own traffic before you commit." },
  { title: "Contract and rollout", detail: "One Singtel contract, one account team, phased by site." },
];

// Params resolve inside Suspense, so the shell streams instantly under cacheComponents.
export default function ProposalPage({ params }: PageProps<"/proposal/[id]">) {
  return <Suspense>{params.then(({ id }) => <ProposalDocument id={id} />)}</Suspense>;
}

// Customer-facing: no internal scores, qualification, competitors, or billing notes.
function ProposalDocument({ id }: { id: string }) {
  const company = getCompany(id);
  if (!company) notFound();
  const history = getAccountHistory(company.id);
  const evidence = company.signals.filter((s) => s.source.kind !== "simulated-telemetry");

  return (
    <div className="min-h-dvh bg-[#ECEEF2]">
      <header data-tone="red" className="st-hero st-dark">
        <div className="mx-auto max-w-5xl px-4 pt-5 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <BrandLockup height={26} tone="dark" />
              <span className="text-[14px] font-semibold text-white">Enterprise</span>
            </div>
            <span className="flex items-center gap-2 text-[13px] text-white">
              Prepared for
              <span className="st-light rounded-md bg-white p-0.5">
                <CompanyLogo id={company.id} name={company.companyName} size={24} />
              </span>
              <span className="font-semibold">{company.companyName}</span>
              {company.isDemoAccount && <span className="rounded-sm border border-white/40 px-1.5 text-[11px]">Sample account</span>}
            </span>
            <ProposalUtilities />
          </div>
          <h1 className="mt-8 max-w-[22ch] text-[30px] leading-tight font-semibold text-white sm:text-[36px]">{company.recommendedBundle.bundleName}</h1>
          <p className="mt-2 max-w-[70ch] text-[14px] text-white">
            {company.corridorLabel.replace("<->", "to")}, {company.industryLabel}. Indicative {formatSgd(company.recommendedBundle.estimatedArrSgd)} per year, derived from catalogue values.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            {company.likelyNeeds.map((need) => (
              <li key={need} className="st-glass px-4 py-3 text-[13px] font-medium text-white">
                {need}
              </li>
            ))}
          </ul>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        <CustomerLines id={company.id} bundle={company.recommendedBundle.products} />

        <section className="rounded-[10px] border border-st-line bg-white p-4 sm:p-5">
          <h2 className="text-[16px] font-semibold text-primary">Why now</h2>
          <p className="mt-2 text-[14px] text-primary">{company.whyNow}</p>
          <ul className="mt-3 space-y-2">
            {evidence.map((s, i) => (
              <li key={i} className="text-[13px] text-primary">
                {s.claim}{" "}
                <a href={s.source.url} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                  {s.source.publisher}
                </a>
              </li>
            ))}
            {evidence.length === 0 && <li className="text-[13px] text-secondary">No signal found.</li>}
          </ul>
        </section>

        {history && (
          <section className="overflow-hidden rounded-[10px] border border-st-line bg-white">
            <h2 className="border-b border-st-line px-4 py-3 text-[16px] font-semibold text-primary">Your sites on the Singtel network</h2>
            <ul className="divide-y divide-st-line">
              {history.sites.map((s) => (
                <li key={s.siteId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-primary">{s.name}</span>
                    <span className="block text-[12px] text-secondary">{s.address}</span>
                  </span>
                  <span className="text-[12px] text-secondary">
                    Fibre {NET_LABEL[s.fiber]}, 5G {NET_LABEL[s.fiveG]}
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-st-line px-4 py-2 text-[12px] text-secondary">Near-net and off-net sites are confirmed in the site survey before any build.</p>
          </section>
        )}

        <RoiSandbox company={company} />

        <section className="grid gap-5 md:grid-cols-2">
          <div className="rounded-[10px] border border-st-line bg-white p-4 sm:p-5">
            <h2 className="text-[16px] font-semibold text-primary">Compliance covered</h2>
            <ul className="mt-2 space-y-1.5 text-[13px]">
              {company.complianceFlags.map((code) => {
                const r = getRegulation(code)!;
                return (
                  <li key={code}>
                    <a href={r.source.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">
                      {r.name}
                    </a>{" "}
                    <span className="text-secondary">({r.jurisdiction})</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[12px] text-secondary">{company.complianceNote}</p>
          </div>
          <div className="rounded-[10px] border border-st-line bg-white p-4 sm:p-5">
            <h2 className="text-[16px] font-semibold text-primary">Next steps</h2>
            <ol className="mt-2 space-y-2">
              {NEXT_STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-3 text-[13px]">
                  <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-st-red text-[12px] font-semibold text-white">{i + 1}</span>
                  <span>
                    <span className="block font-medium text-primary">{s.title}</span>
                    <span className="block text-secondary">{s.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
    </div>
  );
}
