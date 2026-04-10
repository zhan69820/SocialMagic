"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Archive, Settings, Menu, X, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/providers/theme-provider";

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
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex min-h-screen">
      {/* ================================================================
          Desktop sidebar
          ================================================================ */}
      <aside
        className="hidden lg:flex fixed top-0 left-0 h-screen w-64 z-50 flex-col backdrop-blur-2xl border-r"
        style={{
          background: "var(--bg-sidebar)",
          borderColor: "var(--bg-sidebar-border)",
        }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-4 px-6 pt-8 pb-8">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30 animate-float-slow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-[17px] font-semibold tracking-tight whitespace-nowrap text-gradient-shimmer">
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
                        ? isDark
                          ? "bg-violet-500/15 text-violet-300"
                          : "bg-violet-50 text-violet-700"
                        : isDark
                          ? "text-gray-500 hover:bg-white/[0.04] hover:text-gray-300"
                          : "text-gray-400 hover:bg-black/[0.03] hover:text-gray-700"
                    }
                  `}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-violet-400 to-cyan-400"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <span
                    className={`w-6 h-6 shrink-0 flex items-center justify-center transition-colors duration-200 ${
                      active
                        ? "text-violet-400"
                        : isDark
                          ? "text-gray-600 group-hover:text-gray-400"
                          : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                  </span>
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer with theme toggle */}
          <div className="px-4 pt-4 pb-6 flex items-center justify-between" style={{ borderTop: "1px solid var(--bg-sidebar-border)" }}>
            <span className="text-[11px] text-gray-500">SocialMagic v1.0</span>
            <motion.button
              onClick={toggle}
              whileTap={{ scale: 0.85, rotate: 180 }}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-200 hover:bg-white/[0.06]"
              style={{ color: "var(--text-tertiary)" }}
              aria-label={isDark ? "切换亮色模式" : "切换暗色模式"}
            >
              <motion.div
                initial={false}
                animate={{ rotate: isDark ? 0 : 180 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </motion.div>
            </motion.button>
          </div>
        </div>
      </aside>

      {/* ================================================================
          Mobile header
          ================================================================ */}
      <header
        className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 backdrop-blur-2xl border-b"
        style={{
          background: "var(--bg-sidebar)",
          borderColor: "var(--bg-sidebar-border)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-gradient-shimmer">SocialMagic</span>
        </div>
        <div className="flex items-center gap-1">
          <motion.button
            onClick={toggle}
            whileTap={{ scale: 0.85 }}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition"
            style={{ color: "var(--text-tertiary)" }}
            aria-label="Toggle theme"
          >
            {isDark ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
          </motion.button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition"
            style={{ color: "var(--text-tertiary)" }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
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
              className="lg:hidden fixed inset-0 z-40 backdrop-blur-sm"
              style={{ background: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.1)" }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="lg:hidden fixed left-0 top-14 bottom-0 z-50 w-[280px] backdrop-blur-2xl border-r px-3 py-6 space-y-1"
              style={{
                background: "var(--bg-sidebar)",
                borderColor: "var(--bg-sidebar-border)",
              }}
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
                        ? isDark
                          ? "bg-violet-500/15 text-violet-300"
                          : "bg-violet-50 text-violet-700"
                        : isDark
                          ? "text-gray-500 hover:bg-white/[0.04] hover:text-gray-300"
                          : "text-gray-400 hover:bg-black/[0.03] hover:text-gray-700"
                      }
                    `}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-violet-400 to-cyan-400" />
                    )}
                    <span className={`w-6 h-6 shrink-0 flex items-center justify-center ${active ? "text-violet-400" : "text-gray-500"}`}>
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
          Main content area — wider
          ================================================================ */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8 lg:py-16">
          {children}
        </div>
      </main>
    </div>
  );
}
