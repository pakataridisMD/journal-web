"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Viewer } from "./viewer-context";

type Item = { href: string; label: string; exact?: boolean };
type Group = { label: string; items: Item[] };

export function navGroups(viewer: Viewer): Group[] {
  const groups: Group[] = [
    {
      label: "Author",
      items: [
        { href: "/dashboard", label: "Overview", exact: true },
        { href: "/dashboard/submissions", label: "My submissions" },
      ],
    },
  ];
  if (viewer.isReviewer) {
    groups.push({ label: "Reviewer", items: [{ href: "/dashboard/reviews", label: "Review invitations" }] });
  }
  if (viewer.isEditor) {
    groups.push({
      label: "Editor",
      items: [
        { href: "/dashboard/editorial", label: "Editorial queue" },
        { href: "/dashboard/production", label: "Production" },
        ...(viewer.isAdmin
          ? [
              { href: "/dashboard/issues", label: "Issues" },
              { href: "/dashboard/people", label: "People and roles" },
              { href: "/dashboard/board", label: "Editorial board" },
            ]
          : []),
      ],
    });
  }
  groups.push({ label: "Account", items: [{ href: "/dashboard/profile", label: "Profile" }] });
  return groups;
}

function active(pathname: string, item: Item) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SidebarNav({ viewer }: { viewer: Viewer }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="space-y-7">
      {navGroups(viewer).map((group) => (
        <div key={group.label}>
          <p className="meta-label px-3 text-muted-foreground">{group.label}</p>
          <ul className="mt-2 space-y-px">
            {group.items.map((item) => {
              const isActive = active(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative flex h-9 items-center px-3 text-sm transition-colors hover:bg-accent",
                      isActive && "bg-accent font-medium before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-brand",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Phones: the same destinations as a scrollable row. */
export function TopNav({ viewer }: { viewer: Viewer }) {
  const pathname = usePathname();
  const items = navGroups(viewer).flatMap((g) => g.items);
  return (
    <nav aria-label="Dashboard" className="-mx-4 overflow-x-auto border-b px-4 lg:hidden">
      <ul className="flex gap-5">
        {items.map((item) => {
          const isActive = active(pathname, item);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center text-sm whitespace-nowrap",
                  isActive && "font-medium after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-brand",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
