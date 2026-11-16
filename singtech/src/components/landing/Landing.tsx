import Link from "next/link";
import { BrandLockup } from "../ui/BrandLockup";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Cloud, Cpu, EyeOff, HeartPulse, KeyRound, Plus, RadioTower, ShieldCheck, Target, type LucideIcon } from "lucide-react";

// Product site at /, after the team's SingTech AI landing page (accounting-ai repo): same section order and layout,
// in SingTech's red and ink. Every figure here is something the demo does today, or is labelled as planned.

const NAV = [
  { href: "#product", label: "Product" },
  { href: "#how", label: "How it works" },
  { href: "#security", label: "Security" },
  { href: "#faq", label: "FAQ" },
];

const STATS = [
  { value: "9", label: "Singtel products and partners behind every recommendation", tone: "bg-white text-primary border border-st-line" },
  { value: "Every", label: "insight cites the record or public article it came from", tone: "bg-[#0A0A0C] text-white" },
  { value: "1 to 3 s", label: "for a cited answer from the account history", tone: "bg-st-red text-white" },
  { value: "1", label: "next best action per account, and it is never a discount", tone: "bg-[#fff1f2] text-primary" },
];

const FEATURES: { title: string; text: string; icon: LucideIcon }[] = [
  { title: "Sales Copilot timeline", text: "Emails, calls, WhatsApp, bills, cases and meetings for one enterprise, newest first.", icon: BriefcaseBusiness },
  { title: "Health and why", text: "A 0 to 100 score from rules, with every point linked to the record behind it.", icon: HeartPulse },
  { title: "Next best action", text: "One action per account, with talking points and the person to call.", icon: Target },
  { title: "Live triggers", text: "News from India and Singapore matched to the catalogue, each with its source link.", icon: RadioTower },
  { title: "Salesforce in the loop", text: "Approve, then the Account and Opportunity update and the deal room hears about it.", icon: Cloud },
];

const STEPS = [
  { n: "01", title: "Bring in the history", text: "Salesforce records, invoices and cases, plus the emails, WhatsApp and Telegram exports, PDFs and spreadsheets a rep imports.", tag: "Live in demo" },
  { n: "02", title: "Score every account", text: "Rules read incidents, cases, bills, contacts and meetings, and explain the score with record IDs." },
  { n: "03", title: "Decide and prepare", text: "One next best action, a call brief and a draft proposal, with answers grounded in the account history." },
  { n: "04", title: "Approve, then sync", text: "Nothing reaches Salesforce or a customer until the rep approves it.", tag: "Live in demo" },
];

const SECURITY: { title: string; text: string; icon: LucideIcon; live: boolean }[] = [
  { title: "Personal data redacted first", text: "Names, emails and phone numbers are masked before any search, sync or message, and each redaction is logged.", icon: EyeOff, live: true },
  { title: "Answers from a private GPU", text: "Search, ranking and writing run on hardware the team controls. No customer record goes to a public AI service.", icon: Cpu, live: true },
  { title: "Approval before anything leaves", text: "Salesforce updates and deal room posts wait for the rep to approve them.", icon: BadgeCheck, live: true },
  { title: "Secrets stay on the server", text: "Keys live in server configuration only and never reach the browser.", icon: KeyRound, live: true },
  { title: "Single sign-on and roles", text: "Account executives see their own book; managers see the team. This demo is open without sign-in.", icon: ShieldCheck, live: false },
];

const PILOT = [
  { title: "One account team", text: "Start with a single enterprise account team and its existing customers." },
  { title: "Approval on every write", text: "The team approves each Salesforce update until it trusts the drafts." },
  { title: "Eight weeks, measured", text: "Renewals protected, opportunities created and prep time saved, against a control team." },
];

const FAQ = [
  { q: "How does it connect to Salesforce?", a: "Through the Salesforce REST API with a dedicated integration user. After a rep approves, SingTech creates or updates the Account and Opportunity with its next step, and posts to the deal room in Chatter. The Salesforce page shows the live records." },
  { q: "Is customer data sent anywhere?", a: "Answers are written on a private GPU, and personal data is redacted before any search or sync. Salesforce only receives what a rep approves." },
  { q: "Is this real customer data?", a: "No. Existing customers are sample accounts with sample data. Prospects are real companies, each with the public article behind the signal, and they are never shown as Singtel customers." },
  { q: "What can a rep import?", a: "Emails (.eml), WhatsApp and Telegram chat exports, PDFs, Excel and CSV files, screenshots, pasted notes and live call transcripts. Each one lands on the account timeline and becomes searchable." },
];

const H = "font-[family-name:var(--font-jakarta)] tracking-[-0.025em]";


function Cta({ small = false }: { small?: boolean }) {
  return (
    <Link href="/dashboard" className={`inline-flex items-center gap-2 rounded-full bg-st-red font-semibold text-white shadow-[0_10px_28px_rgba(230,0,18,0.28)] transition-transform duration-[180ms] hover:bg-[#C8000F] motion-safe:hover:-translate-y-0.5 ${small ? "min-h-10 px-5 text-[14px]" : "min-h-12 py-1 pr-6 pl-1.5 text-[15px]"}`}>
      {!small && (
        <span aria-hidden className="grid size-9 place-items-center rounded-full bg-white text-st-red">
          <ArrowRight className="size-4" />
        </span>
      )}
      Open the dashboard
    </Link>
  );
}

function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="mx-auto w-full max-w-[1120px] rounded-[18px] border border-st-line bg-white p-2 shadow-[0_30px_80px_rgba(10,10,12,0.14)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={1600} height={1000} className="block h-auto w-full rounded-[12px]" loading="lazy" />
    </div>
  );
}

function SectionTitle({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return <h2 className={`${H} text-[30px] leading-tight font-semibold text-primary sm:text-[40px] ${center ? "text-center" : ""} [&_em]:font-normal [&_em]:text-st-red-ink`}>{children}</h2>;
}

export function Landing() {
  return (
    <div className="min-h-screen bg-white text-primary">
      <header className="absolute inset-x-0 top-0 z-10 mx-auto flex w-[min(1180px,100%-32px)] items-center justify-between gap-4 pt-4">
        <Link href="/" aria-label="SingTech AI home">
          <BrandLockup tagline />
        </Link>
        <nav aria-label="Product site" className="hidden gap-1 rounded-full border border-st-line bg-white p-1 shadow-sm md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="rounded-full px-4 py-2 text-[14px] font-medium text-primary hover:bg-[#f2f4f7]">
              {n.label}
            </a>
          ))}
        </nav>
        <Cta small />
      </header>

      <main>
        <section aria-labelledby="hero-title" className="relative overflow-hidden bg-[linear-gradient(180deg,#fff4f4_0%,#fff9f9_46%,#ffffff_100%)] px-4 pt-28 text-center">
          <svg aria-hidden viewBox="0 0 1440 720" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
            <defs>
              <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="42" />
              </filter>
            </defs>
            <g filter="url(#soft)">
              <ellipse cx="260" cy="170" rx="260" ry="150" fill="rgba(230,0,18,0.10)" />
              <ellipse cx="1180" cy="150" rx="280" ry="170" fill="rgba(10,10,12,0.06)" />
              <path d="M0 470 C 240 380 480 560 720 470 S 1200 360 1440 460 V720 H0Z" fill="rgba(230,0,18,0.07)" />
              <path d="M0 560 C 320 470 620 650 940 545 S 1310 480 1440 560 V720 H0Z" fill="rgba(10,10,12,0.04)" />
            </g>
          </svg>
          <div className="relative mx-auto grid max-w-[880px] justify-items-center gap-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-st-line bg-white px-4 py-2 text-[13px] font-medium shadow-sm">
              <span aria-hidden className="size-2 rounded-full bg-st-red shadow-[0_0_0_4px_rgba(230,0,18,0.12)]" />
              Built for Singtel enterprise account teams
            </p>
            <h1 id="hero-title" className={`${H} text-[44px] leading-[1.04] font-semibold sm:text-[68px]`}>
              Know every account
              <br />
              <em className="font-normal">
                before it <span className="text-st-red">changes</span>
              </em>
            </h1>
            <p className="max-w-[640px] text-[17px] text-secondary">
              SingTech AI reads your Salesforce records, bills and customer conversations, explains each account&apos;s health, and recommends the next action, with every insight tied to its source.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Cta />
              <a href="#how" className="text-[15px] font-medium text-primary underline-offset-4 hover:underline">
                See how it works
              </a>
            </div>
          </div>
          <div className="relative mt-12 pb-4">
            <Shot src="/landing/dashboard.png" alt="SingTech dashboard: retention watchlist, pipeline by stage and next steps" />
          </div>
        </section>

        <section id="product" aria-labelledby="value-title" className="mx-auto w-[min(1180px,100%-32px)] py-20">
          <h2 id="value-title" className={`${H} max-w-[920px] text-[26px] leading-snug font-semibold sm:text-[34px]`}>
            Account managers spend hours joining Salesforce, Excel, email and WhatsApp before every call. <span className="text-secondary">SingTech AI turns that into one timeline per customer, with the decision already framed.</span>
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <li key={s.label} className={`flex min-h-[180px] flex-col justify-between rounded-[18px] p-6 ${s.tone}`}>
                <span className={`${H} text-[44px] leading-none font-semibold`}>{s.value}</span>
                <span className="text-[14px] opacity-90">{s.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="features-title" className="mx-auto w-[min(1180px,100%-32px)] pb-20">
          <SectionTitle>
            <span id="features-title">
              Everything an account team needs <em>in one view</em>
            </span>
          </SectionTitle>
          <ul aria-label="Capabilities" className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="w-[280px] shrink-0 snap-start rounded-[18px] border border-st-line bg-[radial-gradient(60%_50%_at_10%_90%,rgba(230,0,18,0.08),transparent_70%),#fff] p-6">
                <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-st-red-fill text-st-red-ink">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-10 text-[17px] font-semibold">{f.title}</h3>
                <p className="mt-1 text-[14px] text-secondary">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="how" aria-labelledby="how-title" className="mx-auto w-[min(1180px,100%-32px)] pb-20">
          <SectionTitle>
            <span id="how-title">
              Four steps to a <em>healthier book</em>
            </span>
          </SectionTitle>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="flex flex-col gap-2 rounded-[18px] border border-st-line bg-white p-6">
                <span className={`${H} text-[15px] font-semibold text-st-red-ink`}>{s.n}</span>
                <h3 className="text-[17px] font-semibold">{s.title}</h3>
                <p className="flex-1 text-[14px] text-secondary">{s.text}</p>
                {s.tag && (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#ecfdf3] px-2.5 py-0.5 text-[12px] font-medium text-st-verified">
                    <span aria-hidden className="size-1.5 rounded-full bg-[#059669]" />
                    {s.tag}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="showcase-title" className="bg-[linear-gradient(180deg,#ffffff,#fff6f6)] px-4 py-20">
          <SectionTitle center>
            <span id="showcase-title">
              One timeline for <em>every customer conversation</em>
            </span>
          </SectionTitle>
          <p className="mx-auto mt-3 mb-10 max-w-[680px] text-center text-[16px] text-secondary">
            The Sales Copilot puts emails, calls, WhatsApp, bills, cases and meetings on one timeline, and answers questions about the account with sources.
          </p>
          <Shot src="/landing/copilot.png" alt="Sales Copilot: an enterprise's timeline of emails, calls, messages, bills and cases" />
        </section>

        <section id="security" aria-labelledby="security-title" className="mx-auto w-[min(1180px,100%-32px)] py-20">
          <SectionTitle>
            <span id="security-title">
              Private by design, <em>from day one</em>
            </span>
          </SectionTitle>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SECURITY.map((s) => (
              <li key={s.title} className="flex flex-col gap-2 rounded-[18px] border border-st-line bg-white p-6">
                <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-[#f2f4f7] text-primary">
                  <s.icon className="size-5" />
                </span>
                <h3 className="mt-2 text-[16px] font-semibold">{s.title}</h3>
                <p className="flex-1 text-[14px] text-secondary">{s.text}</p>
                <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${s.live ? "bg-[#ecfdf3] text-st-verified" : "bg-[#f2f4f7] text-secondary"}`}>
                  <span aria-hidden className={`size-1.5 rounded-full ${s.live ? "bg-[#059669]" : "bg-[#8A8F9C]"}`} />
                  {s.live ? "Live in demo" : "Planned for the pilot"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="pilot-title" className="mx-auto w-[min(1180px,100%-32px)] pb-20">
          <SectionTitle>
            <span id="pilot-title">
              A pilot you can <em>measure</em>
            </span>
          </SectionTitle>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {PILOT.map((p, i) => (
              <li key={p.title} className="flex gap-4 rounded-[18px] border border-st-line bg-white p-6">
                <span className={`${H} grid size-9 shrink-0 place-items-center rounded-full bg-[#0A0A0C] text-[15px] font-semibold text-white`}>{i + 1}</span>
                <span>
                  <strong className="block text-[16px]">{p.title}</strong>
                  <span className="text-[14px] text-secondary">{p.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section id="faq" aria-labelledby="faq-title" className="bg-[#0A0A0C] px-4 py-20 text-white">
          <div className="mx-auto grid w-full max-w-[1180px] gap-10 lg:grid-cols-[1fr_1.4fr]">
            {/* Inline colour: the design system's base heading colour would otherwise win over a utility class here. */}
            <h2 id="faq-title" className={`${H} text-[32px] font-semibold sm:text-[40px]`} style={{ color: "#fff" }}>
              Questions, <em className="font-normal text-[#ff6b75]">answered</em>
            </h2>
            <div className="divide-y divide-white/15 border-y border-white/15">
              {FAQ.map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-medium">
                    {f.q}
                    <Plus aria-hidden className="size-4 shrink-0 transition-transform duration-[180ms] group-open:rotate-45" />
                  </summary>
                  <p className="mt-3 text-[15px] text-white/75">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-st-line px-4 py-10">
        <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-6">
          <BrandLockup height={26} />
          <nav aria-label="Footer" className="flex flex-wrap gap-5 text-[14px]">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="text-secondary hover:text-primary">
                {n.label}
              </a>
            ))}
            <Link href="/dashboard" className="font-medium text-primary hover:underline">
              Open the dashboard
            </Link>
          </nav>
          <p className="w-full text-[12px] text-secondary">Existing customers are sample accounts with sample data. Prospects are real companies with public sources. 2026 SingTech AI.</p>
        </div>
      </footer>
    </div>
  );
}
