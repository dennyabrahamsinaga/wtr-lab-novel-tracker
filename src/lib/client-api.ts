export async function readApiErrorMessage(response: Response, fallback?: string) {
  try {
    const json = (await response.json()) as { error?: string };
    if (json?.error) return json.error;
  } catch {}

  return fallback ?? `HTTP ${response.status}`;
}
