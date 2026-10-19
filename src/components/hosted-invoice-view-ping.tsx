"use client";

import { useEffect } from "react";

export function HostedInvoiceViewPing({ token }: { token: string }) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sent = false;
    const send = () => {
      if (sent || document.visibilityState !== "visible") return;
      sent = true;
      void fetch(`/api/i/${token}/view`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
    };
    const arm = () => {
      if (document.visibilityState === "visible" && !sent) timer = setTimeout(send, 2000);
    };
    arm();
    document.addEventListener("visibilitychange", arm);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", arm);
    };
  }, [token]);
  return null;
}
