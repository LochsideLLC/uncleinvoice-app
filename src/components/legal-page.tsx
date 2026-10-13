import type { ReactNode } from "react";
import { PageContainer } from "@/components/page-container";

export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <PageContainer>
      <header>
        <h1 className="text-3xl leading-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
        <p className="mt-5 text-lg">{intro}</p>
      </header>
      <div className="flex flex-col gap-8">{children}</div>
    </PageContainer>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl">{heading}</h2>
      {children}
    </section>
  );
}
