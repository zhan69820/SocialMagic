"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Archive, Settings, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "新的炼金", icon: Sparkles },
  { href: "/vault", label: "我的宝库", icon: Archive },
  { href: "/settings", label: "设置", icon: Settings },
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
      {/* --- Desktop sidebar --- */}
      <aside className="hidden md:flex md:w-[272px] md:shrink-0 md:flex-col md:fixed md:inset-y-0 md:left-0 z-30">
        <div className="flex flex-col h-full m-3 p-6 rounded-2xl bg-white/60 backdrop-blur-2xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-gray-900">
              SocialMagic
            </span>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${
                      active
                        ? "bg-violet-600/10 text-violet-700"
                        : "text-gray-500 hover:bg-gray-100/80 hover:text-gray-900"
                    }
                  `}
                >
                  <item.icon
                    className={`w-[18px] h-[18px] transition-colors ${
                      active ? "text-violet-600" : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  {item.label}
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-600"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="pt-4 border-t border-gray-200/60 text-xs text-gray-400 px-2">
            SocialMagic v1.0
          </div>
        </div>
      </aside>

      {/* --- Mobile header + drawer --- */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 bg-white/70 backdrop-blur-xl border-b border-white/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm">SocialMagic</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="md:hidden fixed left-0 top-14 bottom-0 z-50 w-[272px] bg-white/80 backdrop-blur-2xl p-6 space-y-1 border-r border-white/40"
            >
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition
                      ${active ? "bg-violet-600/10 text-violet-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}
                    `}
                  >
                    <item.icon className={`w-[18px] h-[18px] ${active ? "text-violet-600" : "text-gray-400"}`} />
                    {item.label}
                  </Link>
                );
              })}
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* --- Main content area --- */}
      <main className="flex-1 md:ml-[272px] pt-16 md:pt-0">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
