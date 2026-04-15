import { PushSettings } from "@/app/settings/push-settings";
import { FavoritesPanel } from "@/app/settings/favorites-panel";

export default function SettingsPage() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="text-sm font-semibold">Notifications</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Enable push notifications to get alerted when new chapters are detected for your favorite novels. No login is
          required. Favorites are linked to your browser profile cookie and stored in the database.
        </p>
        <div className="mt-3">
          <PushSettings vapidPublicKey={publicKey} />
        </div>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="text-sm font-semibold">Favorites</h2>
        <p className="mt-1 text-sm text-zinc-400">Your favorite novels are checked on a schedule for new chapters.</p>
        <div className="mt-3">
          <FavoritesPanel />
        </div>
      </div>
    </div>
  );
}
