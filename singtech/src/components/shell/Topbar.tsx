"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@astryxdesign/core/Avatar";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { CommandPalette } from "@astryxdesign/core/CommandPalette";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Kbd } from "@astryxdesign/core/Kbd";
import { Popover } from "@astryxdesign/core/Popover";
import { TopNav } from "@astryxdesign/core/TopNav";
import { createStaticSource, type SearchableItem } from "@astryxdesign/core/Typeahead";
import { useToast } from "@astryxdesign/core/Toast";
import { Activity, Bell, FileText, Headset, Plus, Presentation, Search, UserPlus } from "lucide-react";
import { getProduct } from "@/lib/data-service";
import { formatMinutesAgo } from "@/lib/format";
import { isHotSignal, useAppStore } from "@/state/app-store";
import { recordHref, useAccountRecords } from "../account/records";
import { useAgent } from "../agent/AgentProvider";
import { allPages, breadcrumbsFor, type NavLink } from "./nav";

type Hit = SearchableItem<{ description: string; keywords: string[] }>;

// The bell lists new hot news (with source links) above critical usage signals on sample accounts.
function Notifications() {
  const { accounts, openPlaybook, liveAlertIds, feed } = useAppStore();
  const [open, setOpen] = useState(false);
  const [readCount, setReadCount] = useState(0);
  const urgent = accounts
    .flatMap((a) => a.telemetryAlerts.filter((t) => t.severity === "critical").map((alert) => ({ alert, account: a })))
    .sort((x, y) => x.alert.minutesAgo - y.alert.minutesAgo);
  const news = [...feed.alerts, ...feed.signals.filter((x) => isHotSignal(x) && !feed.alerts.some((a) => a.id === x.id))].slice(0, 6);
  const unread = Math.max(feed.alerts.length - readCount, 0);
  const count = urgent.length + unread;
  return (
    <Popover
      isOpen={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setReadCount(feed.alerts.length);
      }}
      label="Notifications"
      placement="below"
      alignment="end"
      width={380}
      content={
        <div className="max-h-[70vh] space-y-1 overflow-y-auto">
          <div className="px-1 pb-1 text-[12px] font-semibold text-primary">News and tenders</div>
          {news.map((n) => (
            <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="block rounded-md p-2 hover:bg-st-hover">
              <span className="line-clamp-2 block text-[13px] font-medium text-primary">{n.title}</span>
              <span className="block text-[12px] text-secondary">
                {n.matchedCompany ? `${n.matchedCompany}, ` : ""}
                {n.source}, score {n.score}
                {feed.alerts.some((a) => a.id === n.id) ? ", new" : ""}
              </span>
            </a>
          ))}
          {news.length === 0 && <p className="px-2 pb-2 text-[12px] text-secondary">No signal found.</p>}
          <div className="border-t border-st-line px-1 pt-2 pb-1 text-[12px] font-semibold text-primary">Critical usage (sample data)</div>
          {urgent.map(({ alert, account }) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => {
                setOpen(false);
                openPlaybook(account.id);
              }}
              className="block w-full rounded-md p-2 text-left hover:bg-st-hover"
            >
              <span className="block text-[13px] font-medium text-primary">{account.companyName}</span>
              <span className="block text-[12px] text-secondary">
                {alert.metric}, {liveAlertIds.has(alert.id) ? "just now" : formatMinutesAgo(alert.minutesAgo)}
              </span>
            </button>
          ))}
        </div>
      }
    >
      <button type="button" aria-label={`Notifications, ${count} new`} className="relative rounded-md p-2 text-primary hover:bg-st-hover">
        <Bell aria-hidden className="size-[18px]" />
        {count > 0 && (
          <span className="tabular absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-st-red px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {count}
          </span>
        )}
      </button>
    </Popover>
  );
}

// Ctrl+K palette over accounts (by name, hub, partner, product) and every page in the sidebar.
function CommandSearch() {
  const router = useRouter();
  const records = useAccountRecords();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const source = useMemo(() => {
    const pages: Hit[] = allPages().map((p) => ({ id: `page:${p.href}`, label: p.label, auxiliaryData: { description: "Go to page", keywords: [] } }));
    const accounts: Hit[] = records.map(({ id, name, company: c, isCustomer }) => ({
      id: `account:${id}`,
      label: name,
      auxiliaryData: {
        description: `${isCustomer ? "Customer" : "Prospect"}${c ? `, ${c.hubLabel}` : ""}`,
        keywords: c ? [c.hubLabel, c.industryLabel, c.coSellPath?.partner ?? "", ...c.recommendedBundle.products.map((pid) => getProduct(pid)!.shortName)] : [],
      },
    }));
    return createStaticSource<Hit>([...accounts, ...pages], { keywords: (i) => i.auxiliaryData?.keywords ?? [] });
  }, [records]);

  const go = (value: string) => {
    setOpen(false);
    if (value.startsWith("page:")) router.push(value.slice(5));
    else if (value.startsWith("account:")) router.push(recordHref(value.slice(8)));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full max-w-[440px] items-center gap-2 rounded-md border border-[#e4e7ec] bg-[#f4f6fa] px-2.5 text-left text-[13px] text-secondary hover:border-[#c7ccd5]"
      >
        <Search aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">Search accounts, products, pages</span>
        <span className="hidden lg:inline">
          <Kbd keys="mod+k" />
        </span>
      </button>
      <CommandPalette<Hit>
        isOpen={open}
        onOpenChange={setOpen}
        searchSource={source}
        onValueChange={go}
        label="Search"
        renderItem={(item) => (
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-medium text-primary">{item.label}</span>
            <span className="truncate text-[12px] text-secondary">{item.auxiliaryData?.description}</span>
          </span>
        )}
      />
    </>
  );
}

function UserMenu() {
  const toast = useToast();
  const { simulateTelemetry, openPlaybook } = useAppStore();
  const simulate = () => {
    const { account, alert, scoreBefore } = simulateTelemetry();
    toast({
      body: `Usage spike at ${account.companyName}: ${alert.metric}. Priority ${scoreBefore} to ${account.priorityScore}.`,
      endContent: <Button size="sm" variant="ghost" label="Open account" onClick={() => openPlaybook(account.id)} />,
    });
  };
  return (
    <DropdownMenu
      hasChevron={false}
      placement="below"
      alignment="end"
      renderTrigger={(props) => (
        <button {...props} type="button" aria-label="Account menu" className="rounded-full">
          <Avatar name="Sarah Tan" size={32} tooltip={false} />
        </button>
      )}
      header={
        <div className="px-3 py-2">
          <div className="text-[13px] font-medium text-primary">Sarah Tan</div>
          <div className="text-[12px] text-secondary">Senior Client Partner, Singtel Enterprise (SG)</div>
        </div>
      }
      items={[
        { label: "Activity", href: "/activity", icon: Activity },
        { type: "divider" },
        { type: "section", label: "Demo controls", items: [{ label: "Simulate usage spike", description: "Adds a sample CUBΣ signal and re-ranks accounts", onClick: simulate }] },
      ]}
    />
  );
}

// Record pages (/accounts/<id>, /proposals/<id>) end the trail with the account name.
function useTrail(pathname: string): NavLink[] {
  const records = useAccountRecords();
  const trail = breadcrumbsFor(pathname);
  const id = pathname.match(/^\/(?:accounts|proposals)\/([^/]+)$/)?.[1];
  const record = id && records.find((r) => r.id === decodeURIComponent(id));
  return record ? [...trail, { href: pathname, label: record.name }] : trail;
}

// Pathname is runtime data on dynamic routes, so the trail streams in inside Suspense.
function Crumbs() {
  const pathname = usePathname();
  const trail = useTrail(pathname);
  return (
    <Breadcrumbs>
      {trail.map((t, i) => (
        <BreadcrumbItem key={t.href + i} href={i < trail.length - 1 ? t.href : undefined} as={Link}>
          {t.label}
        </BreadcrumbItem>
      ))}
    </Breadcrumbs>
  );
}

// Starts the 5-minute judge walkthrough; the label hides on narrow screens.
function PresentButton() {
  const { setPresenting, isPresenting } = useAgent();
  return (
    <>
      <span className="hidden xl:inline-flex">
        <Button size="sm" label="Presentation Mode (5m)" icon={<Presentation aria-hidden className="size-4" />} onClick={() => setPresenting(true)} isDisabled={isPresenting} />
      </span>
      <span className="xl:hidden">
        <Button size="sm" label="Presentation Mode (5m)" isIconOnly icon={<Presentation aria-hidden className="size-4" />} onClick={() => setPresenting(true)} isDisabled={isPresenting} />
      </span>
    </>
  );
}

export function Topbar() {
  const router = useRouter();

  return (
    <>
      <TopNav
        label="Workspace"
        startContent={
          <Suspense>
            <Crumbs />
          </Suspense>
        }
        centerContent={<CommandSearch />}
        endContent={
          <div className="flex items-center gap-1.5">
            <PresentButton />
            <DropdownMenu
              button={{ label: "New", icon: <Plus aria-hidden className="size-4" />, size: "sm" }}
              placement="below"
              alignment="end"
              items={[
                { label: "Prospect", icon: UserPlus, onClick: () => router.push("/accounts/prospects/new") },
                { label: "Call", icon: Headset, onClick: () => router.push("/copilot") },
                { label: "Proposal", icon: FileText, onClick: () => router.push("/proposals") },
              ]}
            />
            <Notifications />
            <UserMenu />
          </div>
        }
      />
    </>
  );
}
