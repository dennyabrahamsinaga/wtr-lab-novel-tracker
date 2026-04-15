import { describe, expect, it } from "vitest";
import { encodeUserCookie, parseUserCookie } from "@/lib/user-cookie";

describe("user cookie signing", () => {
  it("round-trips signed cookies", () => {
    const secret = "super-secret-value";
    const encoded = encodeUserCookie("123e4567-e89b-12d3-a456-426614174000", secret);

    expect(parseUserCookie(encoded, secret)).toEqual({
      userId: "123e4567-e89b-12d3-a456-426614174000",
      needsResign: false,
    });
  });

  it("rejects tampered signed cookies", () => {
    const secret = "super-secret-value";
    const encoded = encodeUserCookie("123e4567-e89b-12d3-a456-426614174000", secret);

    expect(parseUserCookie(encoded.replace("000", "999"), secret)).toBeNull();
  });

  it("accepts legacy unsigned uuid cookies for migration", () => {
    expect(parseUserCookie("123e4567-e89b-12d3-a456-426614174000", "secret")).toEqual({
      userId: "123e4567-e89b-12d3-a456-426614174000",
      needsResign: true,
    });
  });
});
