import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool';
import { requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// ── POST /api/admin/login ─────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const rows = await query<{
    id: string; email: string; password_hash: string; name: string; is_active: boolean;
  }>(
    `SELECT id, email, password_hash, name, is_active
     FROM admin_users WHERE email = $1 LIMIT 1`,
    [email]
  ).catch(() => []);

  if (rows.length === 0) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const admin = rows[0];
  if (!admin.is_active) {
    res.status(403).json({ error: 'Account is disabled' });
    return;
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  await query(
    `UPDATE admin_users SET last_login = NOW() WHERE id = $1`,
    [admin.id]
  );

  const token = jwt.sign(
    { sub: admin.id, email: admin.email, name: admin.name },
    process.env.ADMIN_JWT_SECRET!,
    { expiresIn: (process.env.ADMIN_JWT_EXPIRES_IN || '1d') as `${number}${'s'|'m'|'h'|'d'}` }
  );

  res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
});

// ── GET /api/admin/me ─────────────────────────────────────────
router.get('/me', requireAdmin, async (req: AuthRequest, res: Response) => {
  const rows = await query<{ id: string; email: string; name: string; last_login: string }>(
    `SELECT id, email, name, last_login FROM admin_users WHERE id = $1`,
    [req.userId]
  );
  if (rows.length === 0) { res.status(404).json({ error: 'Admin not found' }); return; }
  res.json(rows[0]);
});

// ── POST /api/admin/change-password ──────────────────────────
router.post('/change-password', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters' });
    return;
  }

  const rows = await query<{ password_hash: string }>(
    `SELECT password_hash FROM admin_users WHERE id = $1`,
    [req.userId]
  );
  if (rows.length === 0) { res.status(404).json({ error: 'Admin not found' }); return; }

  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!valid) { res.status(401).json({ error: 'Current password is incorrect' }); return; }

  const hash = await bcrypt.hash(newPassword, 12);
  await query(`UPDATE admin_users SET password_hash = $1 WHERE id = $2`, [hash, req.userId]);

  res.json({ message: 'Password updated successfully' });
});

export default router;
