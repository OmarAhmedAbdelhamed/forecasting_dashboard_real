/**
 * In-memory rate limiter for API routes
 *
 * Uses a sliding window approach to limit requests based on:
 * - User ID (if authenticated)
 * - IP address (if not authenticated)
 *
 * Note: This is a simple in-memory implementation. For production
 * deployments with multiple server instances, use Redis or similar.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  windowStart: number;
}

/**
 * Rate limit configuration per endpoint type
 */
export interface RateLimitConfig {
  /** Maximum requests allowed */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets: Record<string, RateLimitConfig> = {
  // Strict limits for authentication endpoints
  auth: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 requests per minute
  passwordReset: { maxRequests: 3, windowMs: 15 * 60 * 1000 }, // 3 per 15 minutes

  // Standard limits for general API endpoints
  standard: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute
  read: { maxRequests: 200, windowMs: 60 * 1000 }, // 200 per minute

  // Lenient limits for non-sensitive operations
  public: { maxRequests: 1000, windowMs: 60 * 1000 }, // 1000 per minute
};

// In-memory store for rate limit data
// Map of identifier -> RateLimitEntry
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries from the rate limit store
 * Should be called periodically to prevent memory leaks
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier (user ID or IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit check result
 *
 * @example
 * ```ts
 * import { checkRateLimit } from '@/lib/rate-limit';
 *
 * const result = checkRateLimit('user-123', RateLimitPresets.standard);
 *
 * if (result.isRateLimited) {
 *   return NextResponse.json(
 *     { error: 'Too many requests' },
 *     {
 *       status: 429,
 *       headers: { 'Retry-After': String(result.retryAfter) },
 *     }
 *   );
 * }
 * ```
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RateLimitPresets.standard,
): {
  isRateLimited: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number; // seconds until retry
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // If no entry exists, or window has expired, create new entry
  if (!entry || entry.resetTime < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
      windowStart: now,
    };
    rateLimitStore.set(identifier, newEntry);

    return {
      isRateLimited: false,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
    };
  }

  // Check if we're within the current window
  const timeInWindow = now - entry.windowStart;

  // Sliding window: if we're past the window, reset
  if (timeInWindow >= config.windowMs) {
    entry.count = 1;
    entry.windowStart = now;
    entry.resetTime = now + config.windowMs;

    return {
      isRateLimited: false,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
    };
  }

  // Increment counter
  entry.count++;

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

    return {
      isRateLimited: true,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  return {
    isRateLimited: false,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Reset rate limit for a specific identifier
 * Useful for testing or administrative resets
 *
 * @param identifier - Unique identifier to reset
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get current rate limit status without incrementing
 *
 * @param identifier - Unique identifier
 * @param config - Rate limit configuration
 * @returns Current rate limit status
 */
export function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig = RateLimitPresets.standard,
): {
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetTime < now) {
    return {
      remaining: config.maxRequests,
      resetTime: now + config.windowMs,
    };
  }

  return {
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}

/**
 * Create rate limit headers for response
 * Follows the RateLimit standard HTTP headers
 *
 * @param limit - Maximum requests
 * @param remaining - Remaining requests
 * @param reset - Unix timestamp of reset time
 * @returns Headers object
 */
export function createRateLimitHeaders(
  limit: number,
  remaining: number,
  reset: number,
): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(reset / 1000)),
  };
}

/**
 * Express/Next.js middleware-style rate limiter
 *
 * @param config - Rate limit configuration
 * @returns Middleware function
 *
 * @example
 * ```ts
 * import { rateLimitMiddleware } from '@/lib/rate-limit';
 *
 * export const rateLimiter = rateLimitMiddleware(RateLimitPresets.standard);
 *
 * // In your route handler:
 * const result = await rateLimiter(userId || ip);
 * if (result.isRateLimited) {
 *   return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 * }
 * ```
 */
export function rateLimitMiddleware(config: RateLimitConfig = RateLimitPresets.standard) {
  return (identifier: string) => checkRateLimit(identifier, config);
}
