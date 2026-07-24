"use client";

import type { Role } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/trade", label: "Trade" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/learn", label: "Learn" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/challenges", label: "Challenges" },
  { href: "/teacher", label: "Teacher" },
  { href: "/settings", label: "Account Settings" },
];

export function AppSidebar({ role = "STUDENT" }: { role?: Role }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = role === "ADMIN" ? [...NAV_ITEMS, { href: "/admin", label: "Admin" }] : NAV_ITEMS;

  function navLinkClasses(href: string) {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    return `rounded-md px-3 py-2 text-body transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
      isActive
        ? "bg-background-inset text-foreground"
        : "text-foreground-muted hover:bg-background-inset hover:text-foreground"
    }`;
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        aria-label="Primary"
        className="hidden h-full w-60 shrink-0 flex-col gap-1 border-r border-border bg-background-elevated px-3 py-4 md:flex"
      >
        <Link href="/dashboard" className="mb-4 px-2 text-title font-semibold tracking-tight">
          Fantasy Trade
        </Link>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={navLinkClasses(item.href)}>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Mobile top bar + collapsible menu */}
      <div className="border-b border-border bg-background-elevated md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-title font-semibold tracking-tight">
            Fantasy Trade
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-panel"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            className="flex h-9 w-9 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-background-inset hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span aria-hidden="true" className="text-title">
              {mobileOpen ? "✕" : "☰"}
            </span>
          </button>
        </div>

        {mobileOpen ? (
          <nav id="mobile-nav-panel" aria-label="Primary" className="flex flex-col gap-1 border-t border-border px-3 py-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={navLinkClasses(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </>
  );
}
