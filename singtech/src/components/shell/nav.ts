import { BriefcaseBusiness, Building2, ChartLine, Cloud, FileText, Headset, House, Inbox, MessagesSquare, RadioTower, type LucideIcon } from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
}

export interface NavItem extends NavLink {
  icon: LucideIcon;
  children?: NavLink[];
  // Opens outside the workspace shell, in a new tab.
  isExternal?: boolean;
}

// The sidebar is the only page navigation (CLAUDE.md section 3).
export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "My book",
    items: [
      { href: "/dashboard", label: "Overview", icon: House },
      {
        href: "/accounts",
        label: "Accounts",
        icon: Building2,
        children: [
          { href: "/accounts", label: "All accounts" },
          { href: "/accounts/customers", label: "Customers" },
          { href: "/accounts/prospects", label: "Prospects" },
        ],
      },
    ],
  },
  {
    title: "Deal desk",
    items: [
      { href: "/ai", label: "AI Workspace", icon: MessagesSquare },
      { href: "/sales-copilot", label: "Sales Copilot", icon: BriefcaseBusiness },
      { href: "/copilot", label: "Co-Pilot & RAG", icon: Headset },
      { href: "/proposals", label: "Proposals", icon: FileText },
      { href: "/salesforce", label: "Salesforce", icon: Cloud },
      { href: "/deal-room", label: "Live Deal Room", icon: RadioTower, isExternal: true },
    ],
  },
  {
    title: "Insights",
    items: [
      {
        href: "/insights",
        label: "Impact",
        icon: ChartLine,
        children: [
          { href: "/insights", label: "Performance" },
          { href: "/insights/map", label: "Coverage map" },
        ],
      },
    ],
  },
];

export const NAV_FOOTER: NavItem[] = [{ href: "/activity", label: "Activity", icon: Inbox }];

// Pages reached from actions rather than the sidebar still get a readable last crumb.
const LEAF_PAGES: Record<string, string> = { "/accounts/prospects/new": "New prospect" };

// Exact match for leaf links; a parent is "in section" when the path sits under it.
export const isCurrent = (href: string, pathname: string) => pathname === href;
export const isWithin = (href: string, pathname: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

export const allPages = (): NavItem[] =>
  [...NAV_SECTIONS.flatMap((s) => s.items.flatMap((i): NavItem[] => [i, ...(i.children ?? []).map((c) => ({ ...c, icon: i.icon }))])), ...NAV_FOOTER].filter(
    (p, i, all) => !p.isExternal && all.findIndex((x) => x.href === p.href) === i,
  );

export function breadcrumbsFor(pathname: string): NavLink[] {
  const trail: NavLink[] = [];
  for (const item of [...NAV_SECTIONS.flatMap((s) => s.items), ...NAV_FOOTER]) {
    if (!isWithin(item.href, pathname)) continue;
    trail.push(item);
    const child = item.children?.find((c) => c.href !== item.href && isWithin(c.href, pathname));
    if (child) trail.push(child);
  }
  if (LEAF_PAGES[pathname]) trail.push({ href: pathname, label: LEAF_PAGES[pathname] });
  return trail.length ? trail : [{ href: "/dashboard", label: "Overview" }];
}
