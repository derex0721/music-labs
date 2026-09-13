import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Music Labs — Learn. Create. Discover Music.",
  description: "Music theory, creator tools, quizzes and music technology news.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
