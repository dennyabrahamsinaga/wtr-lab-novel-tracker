import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { STORAGE_UNAVAILABLE_MESSAGE, isDatabaseUnavailableError } from "@/lib/db-errors";
import { hasValidCronSecret } from "@/lib/request-guard";
import { sendPush } from "@/lib/push";
import { getServerEnv } from "@/lib/env";
import { isStalePushSubscriptionError, shouldAdvanceNotificationCheckpoint } from "@/lib/notifications/logic";
import { fetchNovelByIdAndSlug } from "@/lib/wtr/novel";

export const runtime = "nodejs";

function isCron(req: Request) {
  // Vercel Cron sends this header.
  return req.headers.get("x-vercel-cron") === "1";
}

export async function GET(req: Request) {
  try {
    if (process.env.NODE_ENV === "production" && !isCron(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const env = getServerEnv();
    if (!hasValidCronSecret(req, env.CRON_SECRET)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!env.VAPID_SUBJECT || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Missing VAPID env (VAPID_SUBJECT/VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY)" },
        { status: 500 },
      );
    }

    const favorites = await prisma.favorite.findMany({
      include: { user: { include: { pushSubs: true } } },
    });

    let checked = 0;
    let notified = 0;
    const errors: string[] = [];

    for (const fav of favorites) {
      checked++;
      try {
        if (fav.user.pushSubs.length === 0) continue;

        const novel = await fetchNovelByIdAndSlug({ id: fav.wtrNovelId, slug: fav.slug }).catch(() => null);
        if (!novel) continue;
        const chapters = novel.lastChapters ?? [];
        const latestOrder = chapters.reduce((m, c) => (c.order > m ? c.order : m), 0);
        if (latestOrder <= fav.lastNotifiedChapterOrder) continue;

        const payload = {
          title: "New chapters available",
          body: `${fav.titleEn} has new chapters (latest: ${latestOrder}).`,
          url: `/novels/${novel.wtrNovelId}/${novel.slug}`,
        };

        let sentForFavorite = 0;
        for (const sub of fav.user.pushSubs) {
          try {
            await sendPush(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
            );
            notified++;
            sentForFavorite++;
          } catch (e) {
            if (isStalePushSubscriptionError(e)) {
              await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
            }
            errors.push(`push failed for ${sub.endpoint}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        if (shouldAdvanceNotificationCheckpoint(fav.user.pushSubs.length, sentForFavorite)) {
          await prisma.favorite.update({
            where: { id: fav.id },
            data: {
              wtrNovelId: novel.wtrNovelId,
              slug: novel.slug,
              titleEn: novel.titleEn,
              titleId: novel.titleId,
              lastNotifiedChapterOrder: latestOrder,
            },
          });
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    return NextResponse.json({ ok: true, checked, notified, errors: errors.slice(0, 20) });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({ error: STORAGE_UNAVAILABLE_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to check for chapter updates" }, { status: 500 });
  }
}
