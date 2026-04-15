import { NextResponse } from "next/server";
import { z } from "zod";
import { COOKIE_SECRET_REQUIRED_MESSAGE, isMissingServerConfigError } from "@/lib/config-errors";
import { prisma } from "@/lib/db";
import { STORAGE_UNAVAILABLE_MESSAGE, isDatabaseUnavailableError } from "@/lib/db-errors";
import { isTrustedMutationRequest } from "@/lib/request-guard";
import { getPassiveUser } from "@/lib/user";

export const runtime = "nodejs";

const schema = z.object({ endpoint: z.string().url() });

export async function POST(req: Request) {
  try {
    if (!isTrustedMutationRequest(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, setCookie } = await getPassiveUser();
    if (!userId) {
      return NextResponse.json({ ok: true });
    }

    const json = await req.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

    await prisma.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint, userId } });
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
    if (isMissingServerConfigError(error)) {
      return NextResponse.json({ error: COOKIE_SECRET_REQUIRED_MESSAGE }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to remove push subscription" }, { status: 500 });
  }
}
