"use client";

import { useState } from "react";

function decodeKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const binary = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function PushNotificationControls({ publicKey, enabled }: { publicKey: string; enabled: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function enable() {
    setBusy(true);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("This browser does not support push alerts.");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Allow alerts in your browser settings to turn this on.");
      const worker = await navigator.serviceWorker.register("/sw.js");
      const subscription = await worker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeKey(publicKey),
      });
      const response = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save this device.");
      setMessage("Alerts are on for this device. Choose the alert types above and save.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Push setup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const worker = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await worker?.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/push/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        });
        if (!response.ok) throw new Error("Could not remove this device.");
        await subscription.unsubscribe();
      }
      setMessage("Alerts are off for this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not turn off alerts.");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled || !publicKey) return <p className="text-sm text-muted">Browser alerts are paused.</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Browser alerts need your permission. On iPhone, add Uncle Invoice to your Home Screen first.</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-secondary" type="button" disabled={busy} onClick={enable}>Turn on for this device</button>
        <button className="btn btn-ghost" type="button" disabled={busy} onClick={disable}>Turn off for this device</button>
      </div>
      {message ? <p role="status" className="text-sm text-muted">{message}</p> : null}
    </div>
  );
}
