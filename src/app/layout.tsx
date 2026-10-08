import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Priya Designs Studio — CMS",
  description: "Interior Designer Client Management System — manage clients, projects, BOQ, snags, invoices and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} antialiased font-sans`}>
        <TooltipProvider delay={200}>
          {children}
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
