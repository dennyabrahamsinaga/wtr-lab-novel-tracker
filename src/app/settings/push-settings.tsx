"use client";

import { useEffect, useMemo, useState } from "react";
import { readApiErrorMessage } from "@/lib/client-api";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function PushSettings({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  const canUse = useMemo(() => supported && Boolean(vapidPublicKey), [supported, vapidPublicKey]);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window);
    setPermission(typeof window !== "undefined" ? Notification.permission : "default");
  }, []);

  useEffect(() => {
    async function check() {
      if (!supported) return;
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        setSubscribed(Boolean(sub));
      } catch {
        setSubscribed(false);
      }
    }
    check();
  }, [supported]);

  async function waitForActive(reg: ServiceWorkerRegistration) {
    if (reg.active) return reg.active;
    const sw = reg.installing ?? reg.waiting;
    if (!sw) return null;

    if (sw.state === "activated") return sw;
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Service Worker install timed out.")), 15_000);
      sw.addEventListener("statechange", () => {
        if (sw.state === "activated") {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    return reg.active ?? null;
  }

  async function enable() {
    setLoading(true);
    setError(null);
    try {
      if (!canUse) throw new Error("Push notifications are not configured for this deployment.");

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") throw new Error("Notification permission not granted.");

      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const active = await waitForActive(reg);
      if (!active) throw new Error("Service Worker is not active yet. Please refresh the page and try again.");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error(await readApiErrorMessage(res));
      setSubscribed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const res = await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        if (!res.ok) throw new Error(await readApiErrorMessage(res));
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-zinc-300">
        Status:{" "}
        <span className="font-medium">
          {supported ? (subscribed ? "Subscribed" : "Not subscribed") : "Not supported"}
        </span>
        <span className="ml-2 text-zinc-500">(permission: {permission})</span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={loading || !supported || subscribed}
          onClick={enable}
          className="h-9 rounded-md bg-zinc-100 px-3 text-sm font-medium text-zinc-900 disabled:opacity-40 hover:bg-white"
        >
          Enable
        </button>
        <button
          type="button"
          disabled={loading || !supported || !subscribed}
          onClick={disable}
          className="h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 disabled:opacity-40 hover:bg-zinc-900"
        >
          Disable
        </button>
      </div>

      {!vapidPublicKey ? (
        <div className="text-xs text-zinc-500">
          Missing <code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code>.
        </div>
      ) : null}
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}
