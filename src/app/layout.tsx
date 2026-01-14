import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import 'leaflet/dist/leaflet.css';
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { I18nProvider } from "@/components/providers/i18n-provider";
import { PresenceProvider } from "@/components/providers/presence-provider";
import TopLoadingBar from "@/components/TopLoadingBar";
import { Suspense } from "react";
import DynamicTitle from "@/components/dinamicTitle";
import { UnifiedNotificationToast } from "@/components/UnifiedNotificationToast";
import { AuthProvider } from "@/components/providers/auth-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Qurani - Islamic Social Media",
  description: "Modern Quran application - Read, listen, and learn the Holy Quran with advanced features and beautiful interface",
  manifest: "/manifest.json",
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="/videos" />
        <link rel="dns-prefetch" href="/videos" />
        <link rel="preload" href="/videos/V-utama.mp4" as="video" type="video/mp4" />

        {/* Preload critical fonts untuk performa */}
        <link rel="preload" href="/fonts/indopak-nastaleeq.woff" as="font" type="font/woff" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/surah-name-v4.woff" as="font" type="font/woff" crossOrigin="anonymous" />
        <link rel="preload" href="/" as="font" type="font/woff2" crossOrigin="anonymous" />

      </head>
      <body
        cz-shortcut-listen="true"
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <TopLoadingBar />
        </Suspense>
        <Toaster position="top-right" richColors />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <I18nProvider namespaces={["common", "navigation", "search", "profile"]}>
            <DynamicTitle />
            <AuthProvider>
              <UnifiedNotificationToast />
              <PresenceProvider>
                {children}
              </PresenceProvider>
            </AuthProvider>
          </I18nProvider>
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
