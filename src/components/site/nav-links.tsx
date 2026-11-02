"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "@/components/motion/motion";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/articles", label: "Articles" },
  { href: "/issues", label: "Issues" },
  { href: "/for-authors", label: "For authors" },
  { href: "/about", label: "About" },
  { href: "/who-we-are", label: "Who we are" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop navigation; the active item carries the vermillion marker, which draws in under it. */
export function NavLinks() {
  const pathname = usePathname();
  return <NavList pathname={pathname} />;
}

export function NavList({ pathname }: { pathname: string | null }) {
  return (
    <ul className="flex items-stretch gap-7">
      {NAV.map((item) => {
        const active = pathname ? isActive(pathname, item.href) : false;
        return (
          <li key={item.href} className="flex">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center py-3 text-sm font-medium text-foreground transition-colors hover:text-muted-foreground",
                active &&
                  "nav-marker after:absolute after:inset-x-0 after:bottom-[-1px] after:h-[3px] after:origin-left after:bg-brand hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** The menu's links rise in one after another as the menu slides open. */
export function MobileNavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col">
      {NAV.map((item, i) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href} className="border-b" {...motion("rise", 120 + i * 45)}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className="flex items-center gap-3 py-4 font-serif text-title"
            >
              <span
                aria-hidden
                className={cn("size-2 shrink-0", active ? "bg-brand" : "bg-transparent")}
              />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
