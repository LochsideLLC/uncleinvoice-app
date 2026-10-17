import type { Metadata } from "next";
import { WhatsNewContent } from "@/components/whats-new-content";

export const metadata: Metadata = {
  title: "What's new — Uncle Invoice",
  description: "What Uncle Invoice has shipped, the current version, and what is coming next.",
};

export default function WhatsNewPage() {
  return <WhatsNewContent />;
}
