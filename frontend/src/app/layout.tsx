import type { Metadata } from "next";
import { Newsreader, Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Navbar from "../components/Navbar";
import PageTransition from "../components/PageTransition";
import SmoothScroll from "../components/providers/SmoothScroll";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trackr | Canadian Tech Internships & Co-ops (BC & Alberta)",
  description: "Curated tech internships and co-ops across British Columbia and Alberta with automated tracking and resume matching.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased flex flex-col selection:bg-blue-500/20 selection:text-blue-600 font-sans overflow-x-hidden">
        <SmoothScroll>
          <Providers>
            <Navbar />
            <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-6 overflow-x-hidden">
              <PageTransition>{children}</PageTransition>
            </main>
          </Providers>
        </SmoothScroll>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
