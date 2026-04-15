import { createHmac, timingSafeEqual } from "node:crypto";

const LEGACY_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function signUserId(userId: string, secret: string) {
  return createHmac("sha256", secret).update(`wtr_uid:${userId}`).digest("base64url");
}

export function encodeUserCookie(userId: string, secret?: string | null) {
  if (!secret) return userId;
  return `${userId}.${signUserId(userId, secret)}`;
}

export function parseUserCookie(raw: string | undefined, secret?: string | null) {
  if (!raw) return null;

  if (secret) {
    const splitIndex = raw.lastIndexOf(".");
    if (splitIndex > 0) {
      const userId = raw.slice(0, splitIndex);
      const providedSignature = raw.slice(splitIndex + 1);
      const expectedSignature = signUserId(userId, secret);

      const providedBuffer = Buffer.from(providedSignature);
      const expectedBuffer = Buffer.from(expectedSignature);
      if (
        providedBuffer.length === expectedBuffer.length &&
        timingSafeEqual(providedBuffer, expectedBuffer)
      ) {
        return { userId, needsResign: false };
      }

      return null;
    }
  }

  if (!LEGACY_UUID_RE.test(raw)) return null;
  return { userId: raw, needsResign: Boolean(secret) };
}
