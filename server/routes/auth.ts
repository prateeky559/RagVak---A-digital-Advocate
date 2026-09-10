import { Router, Request, Response, NextFunction } from 'express';
import { db, User } from '../db.js';
import { SecurityService, TokenPayload } from '../security.js';
import { createRateLimiter } from '../rateLimiter.js';

export const authRouter = Router();

// Rate limiters for auth
const loginLimiter = createRateLimiter(10, 60000, 'login');
const registerLimiter = createRateLimiter(5, 60000, 'register');

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  requestId?: string;
}

// Authentication middleware
export function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is required in Authorization header.',
        request_id: req.requestId,
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = SecurityService.verifyToken(token);

  if (!payload) {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Authentication token is invalid or has expired.',
        request_id: req.requestId,
      },
    });
    return;
  }

  req.user = payload;
  next();
}

// Admin role check middleware
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Access restricted to administrators only.',
        request_id: req.requestId,
      },
    });
    return;
  }
  next();
}

// Optional auth middleware (for guest queries vs authenticated queries)
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = SecurityService.verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}

// POST /api/v1/auth/register
authRouter.post('/register', registerLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email, password, and full name are required.',
          request_id: req.requestId,
        },
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: {
          code: 'INVALID_EMAIL',
          message: 'Please provide a valid email address.',
          request_id: req.requestId,
        },
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters long.',
          request_id: req.requestId,
        },
      });
      return;
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      res.status(409).json({
        error: {
          code: 'USER_EXISTS',
          message: 'An account with this email already exists.',
          request_id: req.requestId,
        },
      });
      return;
    }

    const passwordHash = await SecurityService.hashPassword(password);
    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      email: email.trim().toLowerCase(),
      password_hash: passwordHash,
      full_name: full_name.trim(),
      role: 'USER',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.addUser(newUser);

    const accessToken = SecurityService.generateAccessToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });
    const refreshToken = SecurityService.generateRefreshToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    db.addRefreshToken({
      id: `rt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      user_id: newUser.id,
      token: refreshToken,
      expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    });

    res.status(201).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'Could not complete registration. Please try again.',
        request_id: req.requestId,
      },
    });
  }
});

// POST /api/v1/auth/login
authRouter.post('/login', loginLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required.',
          request_id: req.requestId,
        },
      });
      return;
    }

    const user = db.getUserByEmail(email);
    if (!user || !user.is_active) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
          request_id: req.requestId,
        },
      });
      return;
    }

    const validPassword = await SecurityService.comparePassword(password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
          request_id: req.requestId,
        },
      });
      return;
    }

    db.updateUser(user.id, { last_login_at: new Date().toISOString() });

    const accessToken = SecurityService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = SecurityService.generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    db.addRefreshToken({
      id: `rt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      user_id: user.id,
      token: refreshToken,
      expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    });

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'LOGIN_FAILED',
        message: 'Could not complete login. Please try again.',
        request_id: req.requestId,
      },
    });
  }
});

// POST /api/v1/auth/refresh
authRouter.post('/refresh', async (req: AuthenticatedRequest, res: Response) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'refresh_token is required.',
        request_id: req.requestId,
      },
    });
    return;
  }

  const storedToken = db.getRefreshToken(refresh_token);
  if (!storedToken || new Date(storedToken.expiration) < new Date()) {
    res.status(401).json({
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is invalid or expired.',
        request_id: req.requestId,
      },
    });
    return;
  }

  const user = db.getUserById(storedToken.user_id);
  if (!user || !user.is_active) {
    res.status(401).json({
      error: {
        code: 'USER_INACTIVE',
        message: 'User account is inactive or not found.',
        request_id: req.requestId,
      },
    });
    return;
  }

  const newAccessToken = SecurityService.generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  res.json({
    access_token: newAccessToken,
    token_type: 'bearer',
  });
});

// POST /api/v1/auth/logout
authRouter.post('/logout', (req: AuthenticatedRequest, res: Response) => {
  const { refresh_token } = req.body;
  if (refresh_token) {
    db.revokeRefreshToken(refresh_token);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/v1/auth/me
authRouter.get('/me', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = db.getUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'User not found.',
        request_id: req.requestId,
      },
    });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    created_at: user.created_at,
    last_login_at: user.last_login_at,
  });
});
