import type { Metadata } from "next";
import { Zilla_Slab, Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { Assistant } from "../components/Assistant";
import PageTransition from "../components/PageTransition";
import SmoothScroll from "../components/providers/SmoothScroll";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SITE_URL } from "@/lib/site";

const zilla = Zilla_Slab({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Trackr | Canadian internships & co-ops, tracked",
  description:
    "Tech internships and co-ops across Canada, refreshed every 6 hours from company job boards, with a tracker for every application.",
  openGraph: {
    siteName: "Trackr",
    type: "website",
    title: "Trackr | Canadian internships & co-ops, tracked",
    description: "Tech internships, co-ops and new grad roles across Canada, with a tracker for every application.",
  },
  twitter: { card: "summary" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${zilla.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies the saved or system theme before first paint, so dark mode never flashes white. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-background text-slate-900 antialiased flex flex-col selection:bg-accent selection:text-accent-ink font-sans overflow-x-clip">
        <SmoothScroll>
          <Providers>
            <Navbar />
            <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-6 overflow-x-clip">
              <PageTransition>{children}</PageTransition>
            </main>
            <SiteFooter />
            <Assistant />
          </Providers>
        </SmoothScroll>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
