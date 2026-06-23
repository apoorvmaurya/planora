import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/shared/ServiceWorkerRegister";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from '@vercel/analytics/next';

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { validateEnv } from "@/lib/security/env";

validateEnv();

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://planora-plum-beta.vercel.app'),
  title: {
    template: 'Planora — %s | Plans that actually happen',
    default: 'Planora | Plans that actually happen',
  },
  description: "Because group plans shouldn't die in the group chat. Planora aligns your friends, budgets, and schedules in one magical workspace.",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'icon',
        url: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        rel: 'icon',
        url: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  },
  openGraph: {
    title: 'Planora | Plans that actually happen',
    description: "Because group plans shouldn't die in the group chat. Planora aligns your friends, budgets, and schedules in one magical workspace.",
    url: 'https://planora-plum-beta.vercel.app',
    siteName: 'Planora',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Planora — Plans that actually happen',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Planora | Plans that actually happen',
    description: "Because group plans shouldn't die in the group chat. Planora aligns your friends, budgets, and schedules in one magical workspace.",
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dmSans.variable} suppressHydrationWarning>
      <body className="antialiased min-h-[100dvh] flex flex-col overflow-x-hidden w-full max-w-[100vw] theme-transition">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ServiceWorkerRegister />
          {children}
          <Toaster />
          <SpeedInsights />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
