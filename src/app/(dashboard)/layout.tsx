"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Archive, Settings, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "新炼金", icon: Sparkles },
  { href: "/vault", label: "宝库", icon: Archive },
  { href: "/settings", label: "偏好设置", icon: Settings },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* ================================================================
          Desktop sidebar — dark glass + aurora accents
          ================================================================ */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-64 z-50 flex-col bg-black/40 backdrop-blur-2xl border-r border-white/[0.06]">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-4 px-6 pt-8 pb-8">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-[17px] font-semibold tracking-tight text-white whitespace-nowrap">
              SocialMagic
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    group relative flex items-center gap-4 px-4 py-3 rounded-xl text-[13px] font-medium
                    transition-all duration-200
                    ${
                      active
                        ? "bg-violet-500/15 text-violet-300"
                        : "text-gray-500 hover:bg-white/[0.04] hover:text-gray-300"
                    }
                  `}
                >
                  {/* Active left indicator */}
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-violet-400 to-cyan-400"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <span
                    className={`w-6 h-6 shrink-0 flex items-center justify-center transition-colors duration-200 ${
                      active ? "text-violet-400" : "text-gray-600 group-hover:text-gray-400"
                    }`}
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                  </span>
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-6 pt-4 pb-6 border-t border-white/[0.06] text-[11px] text-gray-600">
            SocialMagic v1.0
          </div>
        </div>
      </aside>

      {/* ================================================================
          Mobile header — dark glass
          ================================================================ */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 bg-black/40 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-white">SocialMagic</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:bg-white/[0.06] hover:text-white transition"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="lg:hidden fixed left-0 top-14 bottom-0 z-50 w-[280px] bg-black/60 backdrop-blur-2xl border-r border-white/[0.06] px-3 py-6 space-y-1"
            >
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      relative flex items-center gap-4 px-4 py-3 rounded-xl text-[13px] font-medium transition
                      ${active
                        ? "bg-violet-500/15 text-violet-300"
                        : "text-gray-500 hover:bg-white/[0.04] hover:text-gray-300"
                      }
                    `}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-violet-400 to-cyan-400" />
                    )}
                    <span className={`w-6 h-6 shrink-0 flex items-center justify-center ${active ? "text-violet-400" : "text-gray-600"}`}>
                      <item.icon className="w-[18px] h-[18px]" />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* ================================================================
          Main content area
          ================================================================ */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8 lg:py-16">
          {children}
        </div>
      </main>
    </div>
  );
}
