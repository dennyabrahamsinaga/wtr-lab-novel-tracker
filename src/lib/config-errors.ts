export const COOKIE_SECRET_REQUIRED_MESSAGE =
  "NEXTAUTH_SECRET is required in production to protect signed anonymous profile cookies.";

export class MissingServerConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingServerConfigError";
  }
}

export function isMissingServerConfigError(error: unknown) {
  return error instanceof MissingServerConfigError;
}
