export const STORAGE_UNAVAILABLE_MESSAGE =
  "Favorites and notifications are temporarily unavailable because the storage database is offline.";
export const STORAGE_NOT_READY_MESSAGE =
  "Favorites and notifications are unavailable because the production database schema is not ready yet. Run `npm run db:deploy` against the production database.";

function hasErrorName(error: unknown, expected: string) {
  return error instanceof Error && error.name === expected;
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const code = Reflect.get(error, "code");
  return typeof code === "string" ? code : null;
}

export function isDatabaseUnavailableError(error: unknown) {
  if (hasErrorName(error, "PrismaClientKnownRequestError")) {
    return getErrorCode(error) === "P1001";
  }

  if (hasErrorName(error, "PrismaClientInitializationError")) {
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

export function isDatabaseSchemaMissingError(error: unknown) {
  if (hasErrorName(error, "PrismaClientKnownRequestError")) {
    const code = getErrorCode(error);
    return code === "P2021" || code === "P2022";
  }

  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    (message.includes("table") && message.includes("does not exist")) ||
    (message.includes("relation") && message.includes("does not exist")) ||
    (message.includes("column") && message.includes("does not exist"))
  );
}
