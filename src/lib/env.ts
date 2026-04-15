import { z } from "zod";

const optionalNonEmptyString = () =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional(),
  );

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: optionalNonEmptyString(),
  GITHUB_ID: optionalNonEmptyString(),
  GITHUB_SECRET: optionalNonEmptyString(),
  CRON_SECRET: optionalNonEmptyString(),
  VAPID_SUBJECT: optionalNonEmptyString(),
  VAPID_PUBLIC_KEY: optionalNonEmptyString(),
  VAPID_PRIVATE_KEY: optionalNonEmptyString(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: optionalNonEmptyString(),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type PublicEnv = z.infer<typeof publicSchema>;

export function getServerEnv(): ServerEnv {
  return serverSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GITHUB_ID: process.env.GITHUB_ID,
    GITHUB_SECRET: process.env.GITHUB_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  });
}

export function getPublicEnv(): PublicEnv {
  return publicSchema.parse({
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });
}
