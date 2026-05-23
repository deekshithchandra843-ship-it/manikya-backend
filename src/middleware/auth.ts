import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  isAdmin?: boolean;
}

// ── User JWT middleware ───────────────────────────────────────
export function requireUser(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    req.userId    = payload.sub as string;
    req.userEmail = payload.email as string;
    next();
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' });
  }
}

// ── Admin JWT middleware ──────────────────────────────────────
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as jwt.JwtPayload;
    req.userId  = payload.sub as string;
    req.isAdmin = true;
    next();
  } catch {
    res.status(401).json({ error: 'Admin token expired or invalid' });
  }
}
