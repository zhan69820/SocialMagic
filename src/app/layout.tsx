import type { Metadata } from "next";

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
      <body>{children}</body>
    </html>
  );
}
