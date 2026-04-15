import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { isDatabaseUnavailableError } from "@/lib/db-errors";

describe("database availability detection", () => {
  it("detects Prisma known connectivity errors", () => {
    const error = new Prisma.PrismaClientKnownRequestError("db offline", {
      code: "P1001",
      clientVersion: "test",
    });

    expect(isDatabaseUnavailableError(error)).toBe(true);
  });

  it("detects connection-refused fallback messages", () => {
    expect(isDatabaseUnavailableError(new Error("connect ECONNREFUSED 127.0.0.1:5432"))).toBe(true);
    expect(isDatabaseUnavailableError(new Error("some other failure"))).toBe(false);
  });
});
