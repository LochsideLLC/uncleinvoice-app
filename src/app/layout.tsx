import { ViewAsBanner } from "@/components/view-as-banner";
import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { getSessionUser } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-ui",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Uncle Invoice — That invoice, already filled in",
  description:
    "Uncle already did the paperwork. Seed invoices from the books, text the contractor a link, and get a confirmed invoice back.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();

  return (
    <html lang="en" className={`${fraunces.variable} ${sourceSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ViewAsBanner />
        <div id="site-chrome" className="print:hidden pt-8">
          <SiteHeader user={user} />
        </div>
        <main className="flex-1 pb-16">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
