"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Groups" },
  { href: "/models", label: "All models" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="px-5 sm:px-7 flex gap-6 border-b border-line">
      {TABS.map((t) => {
        const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className="py-3 text-[12px] tracking-wider uppercase border-b-2 -mb-px transition-colors"
            style={{
              color: active ? "var(--fg)" : "var(--muted)",
              borderColor: active ? "var(--fg)" : "transparent",
              fontWeight: active ? 700 : 400,
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
