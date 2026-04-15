import { describe, expect, it } from "vitest";
import { isDatabaseUnavailableError } from "@/lib/db-errors";

describe("database availability detection", () => {
  it("detects Prisma known connectivity errors", () => {
    const error = Object.assign(new Error("db offline"), {
      name: "PrismaClientKnownRequestError",
      code: "P1001",
    });

    expect(isDatabaseUnavailableError(error)).toBe(true);
  });

  it("detects Prisma initialization errors", () => {
    const error = Object.assign(new Error("initialization failed"), {
      name: "PrismaClientInitializationError",
    });

    expect(isDatabaseUnavailableError(error)).toBe(true);
  });

  it("detects connection-refused fallback messages", () => {
    expect(isDatabaseUnavailableError(new Error("connect ECONNREFUSED 127.0.0.1:5432"))).toBe(true);
    expect(isDatabaseUnavailableError(new Error("some other failure"))).toBe(false);
  });
});
