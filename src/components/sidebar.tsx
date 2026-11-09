"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { NAV, activeHref } from "./nav";

export function Sidebar({ locked }: { locked: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = activeHref(pathname);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-40 flex h-16 items-center justify-around rounded-2xl border border-white/[0.06] bg-ink-900/80 px-2 backdrop-blur-xl
        md:inset-x-auto md:top-3 md:bottom-3 md:left-3 md:h-auto md:w-[68px] md:flex-col md:justify-start md:gap-2 md:py-4"
    >
      <Link
        href="/"
        aria-label="Knowledge Diary"
        className="mb-4 hidden size-10 place-items-center rounded-xl bg-gradient-to-br from-[#f8c87f] to-lamp-deep shadow-[0_8px_24px_-8px_rgb(244_183_99/0.7)] md:grid"
      >
        <svg viewBox="0 0 64 64" className="size-6">
          <path d="M18 17h18a10 10 0 0 1 10 10v20H28a10 10 0 0 1-10-10z" fill="#0a0a0c" />
          <path d="M26 28h12M26 35h8" stroke="#f4b763" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </Link>

      {NAV.map(({ href, label, icon: Icon }) => {
        const isActive = active === href;
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className="group relative grid size-11 place-items-center rounded-xl"
          >
            {isActive && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 rounded-xl bg-lamp/[0.12] ring-1 ring-lamp/25"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <Icon
              className={`relative size-[20px] transition ${isActive ? "text-lamp" : "text-ink-400 group-hover:text-ink-100"}`}
              strokeWidth={isActive ? 2.2 : 1.8}
            />
            <span
              className="pointer-events-none absolute left-full ml-3 hidden -translate-x-1 rounded-lg border border-white/[0.07] bg-ink-800 px-2.5 py-1 text-xs whitespace-nowrap text-ink-100 opacity-0 shadow-xl transition
                group-hover:translate-x-0 group-hover:opacity-100 md:block"
            >
              {label}
            </span>
          </Link>
        );
      })}

      {locked && (
        <button
          onClick={logout}
          aria-label="Lock"
          className="group relative grid size-11 place-items-center rounded-xl text-ink-500 hover:text-ink-100 md:mt-auto"
        >
          <LogOut className="size-[18px]" />
          <span className="pointer-events-none absolute left-full ml-3 hidden rounded-lg border border-white/[0.07] bg-ink-800 px-2.5 py-1 text-xs whitespace-nowrap text-ink-100 opacity-0 shadow-xl transition group-hover:opacity-100 md:block">
            Lock
          </span>
        </button>
      )}
    </nav>
  );
}
