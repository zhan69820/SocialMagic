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
    <div className="flex min-h-screen bg-[#F5F5F7]">
      {/* ================================================================
          Desktop sidebar — 280px, fixed, glassmorphism 2.0
          ================================================================ */}
      <aside className="hidden lg:flex lg:w-[280px] lg:shrink-0 lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 z-30 p-2">
        <div className="flex flex-col h-full rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          {/* Logo area — 64px (8×8) top padding */}
          <div className="flex items-center gap-4 px-6 pt-8 pb-8">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-[17px] font-semibold tracking-tight text-gray-900 whitespace-nowrap">
              SocialMagic
            </span>
          </div>

          {/* Navigation — 8px gap between items */}
          <nav className="flex-1 px-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    group flex items-center gap-4 px-4 py-3 rounded-xl text-[13px] font-medium
                    transition-all duration-200
                    ${
                      active
                        ? "bg-violet-50 text-violet-700"
                        : "text-gray-500 hover:bg-white/60 hover:text-gray-800"
                    }
                  `}
                >
                  {/* Fixed-size icon container — 24px */}
                  <span
                    className={`w-6 h-6 shrink-0 flex items-center justify-center transition-colors duration-200 ${
                      active ? "text-violet-600" : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                  </span>
                  <span className="whitespace-nowrap">{item.label}</span>
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="ml-auto w-[6px] h-[6px] rounded-full bg-violet-500"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-6 pt-4 pb-6 border-t border-gray-900/5 text-[11px] text-gray-400">
            SocialMagic v1.0
          </div>
        </div>
      </aside>

      {/* ================================================================
          Mobile header bar — fixed top, glassmorphism
          ================================================================ */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 bg-white/10 backdrop-blur-xl border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">SocialMagic</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/40 transition"
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
              className="lg:hidden fixed inset-0 z-40 bg-black/10 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="lg:hidden fixed left-0 top-14 bottom-0 z-50 w-[280px] bg-white/10 backdrop-blur-2xl border-r border-white/20 px-3 py-6 space-y-1"
            >
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      flex items-center gap-4 px-4 py-3 rounded-xl text-[13px] font-medium transition
                      ${active ? "bg-violet-50 text-violet-700" : "text-gray-500 hover:bg-white/60 hover:text-gray-800"}
                    `}
                  >
                    <span className={`w-6 h-6 shrink-0 flex items-center justify-center ${active ? "text-violet-600" : "text-gray-400"}`}>
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
      <main className="flex-1 lg:ml-[280px] pt-16 lg:pt-0">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8 lg:py-16">
          {children}
        </div>
      </main>
    </div>
  );
}
