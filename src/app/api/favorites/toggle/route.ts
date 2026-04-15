import { NextResponse } from "next/server";
import { z } from "zod";
import { COOKIE_SECRET_REQUIRED_MESSAGE, isMissingServerConfigError } from "@/lib/config-errors";
import { prisma } from "@/lib/db";
import { STORAGE_UNAVAILABLE_MESSAGE, isDatabaseUnavailableError } from "@/lib/db-errors";
import { isTrustedMutationRequest } from "@/lib/request-guard";
import { getOrCreateUserId } from "@/lib/user";

export const runtime = "nodejs";

function isPrismaKnownRequestError(error: unknown, code: string) {
  if (!error || typeof error !== "object") return false;
  return Reflect.get(error, "name") === "PrismaClientKnownRequestError" && Reflect.get(error, "code") === code;
}

const bodySchema = z.object({
  wtrNovelId: z.number().int().positive(),
  slug: z.string().min(1),
  titleEn: z.string().min(1),
  titleId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    if (!isTrustedMutationRequest(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, setCookie } = await getOrCreateUserId();

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const existing = await prisma.favorite.findUnique({
      where: { userId_wtrNovelId: { userId, wtrNovelId: parsed.data.wtrNovelId } },
      select: { id: true },
    });

    let isFavorite = true;
    if (existing) {
      await prisma.favorite.deleteMany({ where: { id: existing.id } });
      isFavorite = false;
    } else {
      await prisma.favorite.upsert({
        where: { userId_wtrNovelId: { userId, wtrNovelId: parsed.data.wtrNovelId } },
        create: {
          userId,
          wtrNovelId: parsed.data.wtrNovelId,
          slug: parsed.data.slug,
          titleEn: parsed.data.titleEn,
          titleId: parsed.data.titleId,
        },
        update: {
          slug: parsed.data.slug,
          titleEn: parsed.data.titleEn,
          titleId: parsed.data.titleId,
        },
      });
    }

    const res = NextResponse.json({ isFavorite });
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
    if (isPrismaKnownRequestError(error, "P2002")) {
      return NextResponse.json({ isFavorite: true });
    }
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({ error: STORAGE_UNAVAILABLE_MESSAGE }, { status: 503 });
    }
    if (isMissingServerConfigError(error)) {
      return NextResponse.json({ error: COOKIE_SECRET_REQUIRED_MESSAGE }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to update favorite" }, { status: 500 });
  }
}
