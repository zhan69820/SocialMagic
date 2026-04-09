import type { Metadata } from "next";
import { IdentityProvider } from "@/providers/identity-provider";

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
    <html lang="zh-CN">
      <body className="bg-[#F5F5F7] antialiased">
        <IdentityProvider>{children}</IdentityProvider>
      </body>
    </html>
  );
}
