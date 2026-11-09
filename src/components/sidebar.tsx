"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { LogoMark } from "./brand";
import { NAV, activeHref } from "./nav";

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="pointer-events-none absolute top-1/2 left-full z-50 ml-4 hidden -translate-x-1 -translate-y-1/2 items-center gap-2 rounded-lg border border-white/[0.08] bg-ink-800 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-ink-100 opacity-0 shadow-xl shadow-black/40 transition duration-150
        group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 md:flex"
    >
      {children}
    </span>
  );
}

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
      aria-label="Main"
      className="surface fixed inset-x-3 bottom-3 z-40 flex h-[68px] items-stretch justify-around rounded-2xl px-1.5 pb-[env(safe-area-inset-bottom)]
        md:inset-x-auto md:top-3 md:bottom-3 md:left-3 md:h-auto md:w-[72px] md:flex-col md:items-center md:justify-start md:gap-1.5 md:px-0 md:py-4"
    >
      <Link href="/" aria-label="Knowledge Diary — home" className="group relative mb-3 hidden md:block">
        <LogoMark className="size-10 drop-shadow-[0_6px_16px_rgb(244_183_99/0.35)] transition group-hover:scale-105" />
        <Tooltip>Knowledge Diary</Tooltip>
      </Link>
      <div className="mb-2 hidden h-px w-8 bg-white/[0.07] md:block" />

      {NAV.map(({ href, label, icon: Icon }) => {
        const isActive = active === href;
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className="group relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl outline-none md:size-11 md:flex-none"
          >
            {isActive && (
              <>
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-1 rounded-xl bg-white/[0.06] ring-1 ring-white/[0.08] md:inset-0"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
                <motion.span
                  layoutId="nav-bar"
                  className="absolute top-1/2 -left-[14px] hidden h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-lamp shadow-[0_0_12px_rgb(244_183_99/0.8)] md:block"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              </>
            )}
            <Icon
              className={`relative size-5 transition ${isActive ? "text-lamp" : "text-ink-400 group-hover:text-ink-100"}`}
              strokeWidth={isActive ? 2.1 : 1.75}
            />
            <span className={`relative text-[10px] font-medium md:hidden ${isActive ? "text-ink-100" : "text-ink-400"}`}>{label}</span>
            <Tooltip>{label}</Tooltip>
          </Link>
        );
      })}

      {locked && (
        <button
          onClick={logout}
          aria-label="Lock diary"
          className="group relative hidden size-11 place-items-center rounded-xl text-ink-500 transition hover:bg-white/[0.04] hover:text-ink-100 md:mt-auto md:grid"
        >
          <LogOut className="size-[18px]" strokeWidth={1.75} />
          <Tooltip>Lock diary</Tooltip>
        </button>
      )}
    </nav>
  );
}
