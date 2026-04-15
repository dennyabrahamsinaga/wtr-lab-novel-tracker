import { NextResponse } from "next/server";
import { COOKIE_SECRET_REQUIRED_MESSAGE, isMissingServerConfigError } from "@/lib/config-errors";
import { prisma } from "@/lib/db";
import {
  STORAGE_NOT_READY_MESSAGE,
  STORAGE_UNAVAILABLE_MESSAGE,
  isDatabaseSchemaMissingError,
  isDatabaseUnavailableError,
} from "@/lib/db-errors";
import { getPassiveUser } from "@/lib/user";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId, setCookie } = await getPassiveUser();
    if (!userId) {
      return NextResponse.json({ favorites: [] });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        wtrNovelId: true,
        slug: true,
        titleEn: true,
        titleId: true,
        lastNotifiedChapterOrder: true,
        updatedAt: true,
      },
    });

    const res = NextResponse.json({ favorites });
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
    return NextResponse.json({ error: "Failed to load favorites" }, { status: 500 });
  }
}
