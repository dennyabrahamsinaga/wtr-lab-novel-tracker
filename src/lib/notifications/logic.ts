export function shouldAdvanceNotificationCheckpoint(subscriberCount: number, successCount: number) {
  return subscriberCount > 0 && successCount > 0;
}

export function isStalePushSubscriptionError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const statusCode = "statusCode" in error ? (error as { statusCode?: number }).statusCode : undefined;
  return statusCode === 404 || statusCode === 410;
}

