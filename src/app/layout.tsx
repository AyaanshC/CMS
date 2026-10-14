import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import { InitialSplash } from "@/components/brand/InitialSplash";

const jakarta = localFont({
  src: "./fonts/plus-jakarta-sans-latin.woff2",
  weight: "200 800",
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Priya Designs Studio — CMS",
  description:
    "Interior Designer Client Management System — manage clients, projects, BOQ, snags, invoices and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${jakarta.variable} antialiased font-sans`}>
        <InitialSplash />
        <noscript>
          <style>{`.studio-intro { display: none !important; }`}</style>
        </noscript>
        <TooltipProvider delay={200}>
          {children}
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
