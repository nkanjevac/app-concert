"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={[
        "rounded-full px-3 py-1.5 text-sm transition",
        active
          ? "bg-white/12 text-white"
          : "text-zinc-200 hover:bg-white/7 hover:text-white",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-white">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
            🎟️
          </span>
          <span className="tracking-tight">app-concert</span>
        </Link>

        <div className="hidden flex-1 md:block">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-zinc-300">🔎</span>
            <input
              className="w-full bg-transparent text-sm text-white placeholder:text-zinc-400 focus:outline-none"
              placeholder="Search events, artists, venues..."
            />
          </div>
        </div>

        <nav className="ml-auto flex items-center gap-2">
          <NavItem href="/" label="Početna" />
          <NavItem href="/manage" label="Upravljaj kartom" />
          <NavItem href="/admin" label="Admin" />
        </nav>
      </div>

      <div className="mx-auto block max-w-6xl px-4 pb-3 md:hidden">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <span className="text-zinc-300">🔎</span>
          <input
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-400 focus:outline-none"
            placeholder="Search events, artists, venues..."
          />
        </div>
      </div>
    </header>
  );
}

