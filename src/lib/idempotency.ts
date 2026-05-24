import { redis } from "./redis";
import { IDEMPOTENCY_TTL_SECONDS } from "./constants";

interface StoredResponse {
  body: unknown;
  statusCode: number;
}

export async function withIdempotency<T>(
  key: string | null,
  handler: () => Promise<{ body: T; statusCode: number }>
): Promise<{ body: T; statusCode: number; fromCache: boolean }> {
  if (!key) {
    const result = await handler();
    return { ...result, fromCache: false };
  }

  const cacheKey = `idempotency:${key}`;
  const cached = await redis.get<StoredResponse>(cacheKey);
  if (cached) {
    return { body: cached.body as T, statusCode: cached.statusCode, fromCache: true };
  }

  const result = await handler();
  await redis.setex(cacheKey, IDEMPOTENCY_TTL_SECONDS, JSON.stringify(result));
  return { ...result, fromCache: false };
}