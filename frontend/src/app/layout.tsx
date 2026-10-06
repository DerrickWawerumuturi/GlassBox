import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import {Toaster} from "sonner";
import {AnalysisProvider} from "@/lib/analysis-store";
import CVProvider from "@/lib/cv-store";
import {SessionProvider} from "next-auth/react";
import Navbar from "@/components/Navbar";
import {ThemeWatcher} from "@/components/ThemeMenu";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import SpotlightWatcher from "@/components/SpotlightWatcher";
import {themeScript} from "@/lib/theme";
import {SITE_URL} from "@/lib/site";


/*
 * The brand faces, self-hosted (app/fonts, OFL licences beside them): nothing
 * is fetched from Google at build or dev time, and the dev server no longer
 * falls back to Arial when it can't reach it. Each file is the variable font
 * cut to weights 400-700 and Latin + Latin Extended (how: the 2026-10-05
 * fonts changelog). The variable names are unchanged, so no CSS had to move.
 */
const spaceGrotesk = localFont({
    src: "./fonts/space-grotesk.woff2",
    weight: "400 700",
    variable: "--font-space-grotesk",
    display: "swap",
})

// Reading text: warmer and calmer at 14-16px than Space Grotesk, whose quirks
// suit headlines (docs/decisions/design-system.md).
const schibstedGrotesk = localFont({
    src: "./fonts/schibsted-grotesk.woff2",
    weight: "400 700",
    variable: "--font-schibsted-grotesk",
    display: "swap",
})

const jetBrainsMono = localFont({
    src: "./fonts/jetbrains-mono.woff2",
    weight: "400 700",
    variable: "--font-jetbrains-mono",
    display: "swap",
})

const caveat = localFont({
    src: "./fonts/caveat.woff2",
    weight: "400 700",
    variable: "--font-caveat",
    display: "swap",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Glassbox",
  title: {
    default: "Glassbox",
    template: "%s · Glassbox",
  },
  alternates: {
    canonical: "/",
  },
  description:
      "Upload your CV and Glassbox scans live jobs. In about a minute it shows the skills your market wants, the ones you have, and the ones you don't yet.",
  openGraph: {
    type: "website",
    siteName: "Glassbox",
    title: "Glassbox: your job market, mapped",
    description:
        "Your CV vs the live job market: top skills, the ones you have, the ones you don't yet, and real jobs ranked by fit.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Glassbox: your job market, mapped",
    description:
        "Your CV vs the live job market: top skills, the ones you have, the ones you don't yet, and real jobs ranked by fit.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The theme class is set before paint by the script below, so the server's
      // className and the live one differ on purpose.
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${schibstedGrotesk.variable} ${jetBrainsMono.variable} ${caveat.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{__html: themeScript()}} />
      </head>
      <body className="min-h-full bg-background font-sans text-foreground">
      <ThemeWatcher />
      <SpotlightWatcher />
      <SessionProvider>
          <AnalyticsProvider />
          <AnalysisProvider>
              <CVProvider>
                  <Navbar />
                  <main>
                      {children}
                  </main>
              </CVProvider>
          </AnalysisProvider>
          <Toaster theme="dark" />
      </SessionProvider>
      </body>

    </html>
  );
}
