import { describe, expect, it } from "vitest";
import { hasAuthorizedCronAccess, hasValidCronSecret, isTrustedMutationRequest, isVercelCronRequest } from "@/lib/request-guard";

describe("request guards", () => {
  it("accepts same-origin mutation requests", () => {
    const req = new Request("https://app.example.com/api/favorites/toggle", {
      method: "POST",
      headers: {
        origin: "https://app.example.com",
        "sec-fetch-site": "same-origin",
      },
    });

    expect(isTrustedMutationRequest(req)).toBe(true);
  });

  it("rejects cross-site mutation requests", () => {
    const req = new Request("https://app.example.com/api/favorites/toggle", {
      method: "POST",
      headers: {
        origin: "https://evil.example.com",
        "sec-fetch-site": "cross-site",
      },
    });

    expect(isTrustedMutationRequest(req)).toBe(false);
  });

  it("validates cron bearer secrets", () => {
    const valid = new Request("https://app.example.com/api/cron/check-updates", {
      headers: { authorization: "Bearer top-secret" },
    });
    const invalid = new Request("https://app.example.com/api/cron/check-updates", {
      headers: { authorization: "Bearer wrong" },
    });

    expect(hasValidCronSecret(valid, "top-secret")).toBe(true);
    expect(hasValidCronSecret(invalid, "top-secret")).toBe(false);
    expect(hasValidCronSecret(invalid, undefined)).toBe(true);
  });

  it("recognizes Vercel cron requests", () => {
    const req = new Request("https://app.example.com/api/cron/check-updates", {
      headers: { "x-vercel-cron": "1" },
    });
    expect(isVercelCronRequest(req)).toBe(true);
  });

  it("allows either Vercel cron or bearer-secret cron access", () => {
    const vercelReq = new Request("https://app.example.com/api/cron/check-updates", {
      headers: { "x-vercel-cron": "1" },
    });
    const bearerReq = new Request("https://app.example.com/api/cron/check-updates", {
      headers: { authorization: "Bearer top-secret" },
    });
    const invalidReq = new Request("https://app.example.com/api/cron/check-updates");

    expect(hasAuthorizedCronAccess(vercelReq, "top-secret")).toBe(true);
    expect(hasAuthorizedCronAccess(bearerReq, "top-secret")).toBe(true);
    expect(hasAuthorizedCronAccess(invalidReq, "top-secret")).toBe(false);
  });
});
