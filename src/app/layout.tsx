import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/app/_components/AuthButton";
import { Providers } from "@/app/providers";
import { UrlSanitizer } from "@/app/_components/UrlSanitizer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WTR Lab Novel Tracker",
  description: "Browse WTR-LAB novels, save favorites, and track chapter updates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <Providers>
          <Suspense fallback={null}>
            <UrlSanitizer />
          </Suspense>
          <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/75 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-sm text-amber-200">
                  W
                </span>
                <span>WTR Lab Novel Tracker</span>
              </Link>
              <nav className="flex items-center gap-3 text-sm text-zinc-300">
                <Link href="/" className="hover:text-white">
                  Browse
                </Link>
                <Link href="/best" className="hover:text-white">
                  Best
                </Link>
                <Link href="/settings" className="hover:text-white">
                  Settings
                </Link>
                <AuthButton />
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <footer className="border-t border-zinc-800/80">
            <div className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-zinc-400">
              Data source: WTR-LAB metadata only. Chapter pages are not crawled.
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
