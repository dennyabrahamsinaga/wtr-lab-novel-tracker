import { Prisma } from "@prisma/client";

export const STORAGE_UNAVAILABLE_MESSAGE =
  "Favorites and notifications are temporarily unavailable because the storage database is offline.";

export function isDatabaseUnavailableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P1001";
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes("can't reach database server") ||
    message.includes("connection refused") ||
    message.includes("econnrefused") ||
    message.includes("database is offline") ||
    message.includes("failed to connect to database")
  );
}
