import type { Metadata } from "next";
import "./globals.css";
import { IdentityProvider } from "@/providers/identity-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ParticleField } from "@/components/ParticleField";

export const metadata: Metadata = {
  title: "SocialMagic",
  description: "AI-powered social media copywriting generator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" data-theme="dark" suppressHydrationWarning>
      <body className="antialiased">
        {/* Ambient background orbs */}
        <div className="bg-orb w-[500px] h-[500px] top-[-10%] left-[-5%] bg-violet-600/[0.07]" />
        <div className="bg-orb w-[400px] h-[400px] top-[30%] right-[-8%] bg-cyan-500/[0.05]" />
        <div className="bg-orb w-[300px] h-[300px] bottom-[5%] left-[20%] bg-fuchsia-500/[0.04]" />

        {/* Floating particles */}
        <ParticleField />

        <ThemeProvider>
          <IdentityProvider>{children}</IdentityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
