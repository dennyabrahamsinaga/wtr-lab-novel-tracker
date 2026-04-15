import webpush from "web-push";
import { getServerEnv } from "@/lib/env";

let configured = false;

export function ensureWebPushConfigured() {
  if (configured) return;
  const env = getServerEnv();
  if (!env.VAPID_SUBJECT || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    throw new Error("Missing VAPID configuration");
  }
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  configured = true;
}

export async function sendPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: unknown,
) {
  ensureWebPushConfigured();
  await webpush.sendNotification(subscription, JSON.stringify(payload));
}
