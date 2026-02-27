import type { Metadata, Viewport } from "next";
import { Newsreader, Space_Grotesk } from "next/font/google";

import { PwaRegister } from "../components/pwa-register";

import "./globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading"
});

const bodyFont = Newsreader({
  subsets: ["latin"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "DuoPlay",
  description: "Mobilna platforma gier dla Sami i Patryka",
  manifest: "/manifest.json",
  applicationName: "DuoPlay",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-precomposed.png", sizes: "180x180", type: "image/png" }
    ]
  },
  appleWebApp: {
    capable: true,
    title: "DuoPlay",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3f6fff" },
    { media: "(prefers-color-scheme: dark)", color: "#111b2e" }
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" data-theme="light" suppressHydrationWarning>
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
