"use client";

import { Suspense, useMemo, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SideNav, SideNavHeading, SideNavItem, SideNavSection, useSideNavCollapse } from "@astryxdesign/core/SideNav";
import { Building2, ExternalLink, ReceiptText } from "lucide-react";
import { PitchQrButton } from "@/components/dealroom/PitchQrButton";
import { buildDirectory } from "@/lib/agent/directory";
import { openInvoices } from "@/lib/agent/plan";
import { useAgent } from "../agent/AgentProvider";
import { DeskSwitcher } from "./DeskSwitcher";
import { isWithin, NAV_FOOTER, NAV_SECTIONS, type NavItem } from "./nav";

// SingTech AI mark (the S from the logo); it is also the whole brand in the 48px rail.
function BrandIcon() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/singtech-ai-mark.png" alt="SingTech AI" width={30} height={24} className="block h-6 w-[30px] shrink-0 object-contain" />;
}

// Shortcuts for the AI Workspace: companies this browser asked about, and bills that need attention. Hidden in the 48px rail.
function QuickAccess() {
  const { isCollapsed } = useSideNavCollapse();
  const { recents } = useAgent();
  const flagged = useMemo(() => {
    const dir = buildDirectory();
    return openInvoices(dir)
      .slice(0, 4)
      .map((i) => ({ ...i, account: dir.accounts.find((a) => a.id === i.accountId)?.name ?? i.accountId }));
  }, []);
  if (isCollapsed) return null;
  return (
    <>
      {recents.length > 0 && (
        <SideNavSection title="Recently queried">
          {recents.slice(0, 4).map((r) => (
            <SideNavItem key={r.id} label={r.name} icon={Building2} href={`/accounts/${r.id}`} as={Link} />
          ))}
        </SideNavSection>
      )}
      <SideNavSection title="Flagged bill IDs">
        {/* Full IDs need two lines; a SideNavItem row would truncate them. */}
        <ul className="space-y-0.5 px-2">
          {flagged.map((i) => (
            <li key={i.id}>
              <Link
                href={`/ai?ask=${encodeURIComponent(`Why is ${i.id} ${i.status} and what is the next step?`)}`}
                className="flex items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-st-hover"
              >
                <ReceiptText aria-hidden className="mt-0.5 size-4 shrink-0 text-secondary" />
                <span className="min-w-0">
                  <span className="font-id block text-[12px] text-primary">{i.id}</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-secondary">
                    <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${i.status === "disputed" ? "bg-st-red" : "bg-[#D97706]"}`} />
                    <span className="truncate">
                      {i.status === "disputed" ? "Disputed" : "Overdue"}, {i.account}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </SideNavSection>
    </>
  );
}

// The public deal room sits outside the workspace shell, so it opens in its own tab.
function NewTabLink(props: ComponentProps<"a">) {
  return <a {...props} target="_blank" rel="noopener noreferrer" />;
}

function Item({ item, pathname }: { item: NavItem; pathname: string }) {
  if (item.isExternal) {
    return (
      <SideNavItem
        label={item.label}
        icon={item.icon}
        href={item.href}
        as={NewTabLink}
        endContent={<ExternalLink aria-label="Opens in a new tab" className="size-3.5 text-secondary" />}
      />
    );
  }
  if (!item.children) {
    return <SideNavItem label={item.label} icon={item.icon} href={item.href} as={Link} isSelected={isWithin(item.href, pathname)} />;
  }
  // The deepest matching child wins, so /accounts/<id> lights "All accounts" and /accounts/prospects/new lights "Prospects".
  const active = item.children.filter((c) => isWithin(c.href, pathname)).sort((a, b) => b.href.length - a.href.length)[0];
  return (
    <SideNavItem label={item.label} icon={item.icon} href={item.href} as={Link} isSelected={false} collapsible={{ defaultIsCollapsed: false }}>
      {item.children.map((c) => (
        <SideNavItem key={c.href} label={c.label} href={c.href} as={Link} isSelected={c === active} />
      ))}
    </SideNavItem>
  );
}

// The QR button needs a full-width row; in the 48px rail it would only be a clipped label.
function PitchQrFooter() {
  const { isCollapsed } = useSideNavCollapse();
  return isCollapsed ? null : (
    <div className="px-2 pt-1 pb-2">
      <PitchQrButton />
    </div>
  );
}

function Sections({ pathname }: { pathname: string }) {
  return NAV_SECTIONS.map((section) => (
    <SideNavSection key={section.title} title={section.title}>
      {section.items.map((item) => (
        <Item key={item.href} item={item} pathname={pathname} />
      ))}
    </SideNavSection>
  ));
}

function FooterItems({ pathname }: { pathname: string }) {
  return NAV_FOOTER.map((item) => <Item key={item.href} item={item} pathname={pathname} />);
}

// The pathname is runtime data on dynamic routes (/accounts/<id>), so it is read inside Suspense; the fallback is the same nav unselected.
function WithPath({ render }: { render: (pathname: string) => ReactNode }) {
  return <>{render(usePathname())}</>;
}

const withPath = (render: (pathname: string) => ReactNode) => (
  <Suspense fallback={render("")}>
    <WithPath render={render} />
  </Suspense>
);

// Astryx SideNav: labelled, collapsible to a rail with tooltips, width and collapse state persisted under autoSaveId.
export function Sidebar() {
  return (
    <SideNav
      collapsible
      resizable={{ defaultWidth: 240, minWidth: 220, maxWidth: 320, autoSaveId: "singtech.sidenav" }}
      header={
        <SideNavHeading
          heading="SingTech AI"
          subheading="Enterprise sales workspace"
          headingHref="/dashboard"
          icon={<BrandIcon />}
          menu={
            <div className="w-64 space-y-2 p-1">
              <div className="text-[12px] font-medium text-secondary">Division scope</div>
              <DeskSwitcher />
            </div>
          }
        />
      }
      footer={
        <>
          <SideNavSection title="Workspace tools" isHeaderHidden>
            {withPath((pathname) => <FooterItems pathname={pathname} />)}
          </SideNavSection>
          <PitchQrFooter />
        </>
      }
    >
      {withPath((pathname) => <Sections pathname={pathname} />)}
      <QuickAccess />
    </SideNav>
  );
}
