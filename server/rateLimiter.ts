import { Request, Response, NextFunction } from 'express';
import { config } from './config.js';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

class MemoryRateLimiter {
  private records: Map<string, RateLimitRecord> = new Map();

  constructor() {
    // Periodically clean up expired records
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.records.entries()) {
        if (now > record.resetTime) {
          this.records.delete(key);
        }
      }
    }, 60000);
  }

  public check(key: string, limit: number, windowMs: number = 60000): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    let record = this.records.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      this.records.set(key, record);
      return { allowed: true, remaining: limit - 1, resetTime: record.resetTime };
    }

    if (record.count >= limit) {
      return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }

    record.count += 1;
    return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime };
  }
}

export const rateLimiterInstance = new MemoryRateLimiter();

export function createRateLimiter(limit: number, windowMs: number = 60000, prefix: string = 'global') {
  return (req: Request, res: Response, next: NextFunction) => {
    // Identify client by IP or user auth
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const key = `${prefix}:${Array.isArray(ip) ? ip[0] : ip}`;

    const result = rateLimiterInstance.check(key, limit, windowMs);

    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());

    if (!result.allowed) {
      const retryAfterSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Please try again in ${retryAfterSeconds} seconds.`,
          request_id: (req as any).requestId,
        },
      });
      return;
    }

    next();
  };
}
