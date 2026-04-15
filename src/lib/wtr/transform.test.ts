import { describe, expect, it } from "vitest";
import { mapReleaseStatus, mapStatus } from "@/lib/wtr/transform";

describe("wtr status mapping", () => {
  it("maps status codes to ongoing/completed", () => {
    expect(mapStatus(0)).toBe("ongoing");
    expect(mapStatus(1)).toBe("completed");
    expect(mapStatus(3)).toBe("other");
  });

  it("maps raw_status to released/unreleased", () => {
    expect(mapReleaseStatus(0)).toBe("released");
    expect(mapReleaseStatus(-3)).toBe("unreleased");
  });
});

