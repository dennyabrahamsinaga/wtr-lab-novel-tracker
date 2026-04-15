import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions, isAuthConfigured } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { COOKIE_SECRET_REQUIRED_MESSAGE, MissingServerConfigError } from "@/lib/config-errors";
import { getServerEnv } from "@/lib/env";
import { encodeUserCookie, parseUserCookie } from "@/lib/user-cookie";

const COOKIE_NAME = "wtr_uid";

function getCookieSecret() {
  const secret = getServerEnv().NEXTAUTH_SECRET ?? null;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new MissingServerConfigError(COOKIE_SECRET_REQUIRED_MESSAGE);
  }
  return secret;
}

function createSetCookie(value: string) {
  return { name: COOKIE_NAME, value };
}

export async function getAuthenticatedUserId() {
  if (!isAuthConfigured()) return null;
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function getPassiveUser(): Promise<{
  userId: string | null;
  setCookie?: { name: string; value: string };
}> {
  const authed = await getAuthenticatedUserId();
  if (authed) return { userId: authed };

  const jar = await cookies();
  const parsed = parseUserCookie(jar.get(COOKIE_NAME)?.value, getCookieSecret());
  if (!parsed) return { userId: null };

  return {
    userId: parsed.userId,
    setCookie: parsed.needsResign ? createSetCookie(encodeUserCookie(parsed.userId, getCookieSecret())) : undefined,
  };
}

export async function getPassiveUserId() {
  const { userId } = await getPassiveUser();
  return userId;
}

export async function getOrCreateUserId(): Promise<{
  userId: string;
  setCookie?: { name: string; value: string };
}> {
  const authed = await getAuthenticatedUserId();
  if (authed) return { userId: authed };

  const jar = await cookies();
  const cookieSecret = getCookieSecret();
  const parsed = parseUserCookie(jar.get(COOKIE_NAME)?.value, cookieSecret);
  if (parsed) {
    await prisma.user.upsert({
      where: { id: parsed.userId },
      create: { id: parsed.userId },
      update: {},
      select: { id: true },
    });
    return {
      userId: parsed.userId,
      setCookie: parsed.needsResign ? createSetCookie(encodeUserCookie(parsed.userId, cookieSecret)) : undefined,
    };
  }

  const id = crypto.randomUUID();
  await prisma.user.create({ data: { id } });
  return {
    userId: id,
    setCookie: createSetCookie(encodeUserCookie(id, cookieSecret)),
  };
}
