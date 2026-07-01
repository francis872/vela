type Bucket = {
  count: number;
  windowStart: number;
  blockedUntil: number;
};

type RateLimitOptions = {
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing) {
    buckets.set(key, { count: 0, windowStart: now, blockedUntil: 0 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((existing.blockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  if (now - existing.windowStart > options.windowMs) {
    existing.count = 0;
    existing.windowStart = now;
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function consumeRateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { count: 0, windowStart: now, blockedUntil: 0 };

  if (now - bucket.windowStart > options.windowMs) {
    bucket.count = 0;
    bucket.windowStart = now;
  }

  bucket.count += 1;

  if (bucket.count >= options.maxAttempts) {
    bucket.blockedUntil = now + options.blockMs;
    bucket.count = 0;
    bucket.windowStart = now;
  }

  buckets.set(key, bucket);
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
