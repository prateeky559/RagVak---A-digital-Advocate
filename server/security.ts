import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
  iat?: number;
  exp?: number;
}

export class SecurityService {
  // Password hashing
  public static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // JWT Token Generation
  public static generateAccessToken(payload: { userId: string; email: string; role: 'USER' | 'ADMIN' }): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: `${config.jwtAccessExpiryMinutes}m`,
    });
  }

  public static generateRefreshToken(payload: { userId: string; email: string; role: 'USER' | 'ADMIN' }): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: `${config.jwtRefreshExpiryDays}d`,
    });
  }

  public static verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, config.jwtSecret) as TokenPayload;
    } catch {
      return null;
    }
  }

  // Prompt Injection Detection (Section 18)
  // Detect patterns like "ignore previous instructions", "system prompt", "act as unrestricted", etc.
  public static checkPromptInjection(text: string): { isSuspicious: boolean; reason?: string } {
    const lower = text.toLowerCase();
    const suspiciousPatterns = [
      /ignore (all )?(previous|prior) (instructions|directions|prompts)/i,
      /reveal (the )?(system|internal) (prompt|instructions|keys|passwords)/i,
      /you are now (in )?developer mode/i,
      /disregard (the )?(above|system|guidelines)/i,
      /jailbreak/i,
      /bypass (the )?(guardrails|safety|rules)/i,
      /dan mode/i,
      /drop table/i,
      /<script[\s\S]*?>[\s\S]*?<\/script>/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(lower)) {
        return {
          isSuspicious: true,
          reason: `Input contains prohibited instructional override or injection pattern: ${pattern.toString()}`,
        };
      }
    }

    return { isSuspicious: false };
  }

  // Sanitize filename to prevent directory traversal
  public static sanitizeFilename(filename: string): string {
    return filename
      .replace(/^.*[\\\/]/, '') // remove path components
      .replace(/[^a-zA-Z0-9._-]/g, '_'); // sanitize special characters
  }

  // Sanitize general text
  public static sanitizeText(text: string): string {
    if (!text) return '';
    return text.trim();
  }
}
