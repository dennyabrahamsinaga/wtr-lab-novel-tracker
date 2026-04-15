import { describe, expect, it } from "vitest";
import { isStalePushSubscriptionError, shouldAdvanceNotificationCheckpoint } from "@/lib/notifications/logic";

describe("notification checkpoint logic", () => {
  it("only advances when at least one push notification was delivered", () => {
    expect(shouldAdvanceNotificationCheckpoint(0, 0)).toBe(false);
    expect(shouldAdvanceNotificationCheckpoint(2, 0)).toBe(false);
    expect(shouldAdvanceNotificationCheckpoint(2, 1)).toBe(true);
  });

  it("detects stale push subscriptions from endpoint errors", () => {
    expect(isStalePushSubscriptionError({ statusCode: 404 })).toBe(true);
    expect(isStalePushSubscriptionError({ statusCode: 410 })).toBe(true);
    expect(isStalePushSubscriptionError({ statusCode: 500 })).toBe(false);
    expect(isStalePushSubscriptionError(new Error("boom"))).toBe(false);
  });
});

