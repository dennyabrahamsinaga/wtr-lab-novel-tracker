import { NextResponse } from "next/server";
import { z } from "zod";
import { COOKIE_SECRET_REQUIRED_MESSAGE, isMissingServerConfigError } from "@/lib/config-errors";
import { prisma } from "@/lib/db";
import {
  STORAGE_NOT_READY_MESSAGE,
  STORAGE_UNAVAILABLE_MESSAGE,
  isDatabaseSchemaMissingError,
  isDatabaseUnavailableError,
} from "@/lib/db-errors";
import { isTrustedMutationRequest } from "@/lib/request-guard";
import { getOrCreateUserId } from "@/lib/user";

export const runtime = "nodejs";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: Request) {
  try {
    if (!isTrustedMutationRequest(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, setCookie } = await getOrCreateUserId();

    const json = await req.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

    await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      create: {
        userId,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent: req.headers.get("user-agent"),
      },
      update: {
        userId,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent: req.headers.get("user-agent"),
      },
    });

    const res = NextResponse.json({ ok: true });
    if (setCookie) {
      res.cookies.set(setCookie.name, setCookie.value, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return res;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({ error: STORAGE_UNAVAILABLE_MESSAGE }, { status: 503 });
    }
    if (isDatabaseSchemaMissingError(error)) {
      return NextResponse.json({ error: STORAGE_NOT_READY_MESSAGE }, { status: 503 });
    }
    if (isMissingServerConfigError(error)) {
      return NextResponse.json({ error: COOKIE_SECRET_REQUIRED_MESSAGE }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to save push subscription" }, { status: 500 });
  }
}
