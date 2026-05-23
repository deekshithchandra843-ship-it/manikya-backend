import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool';
import { requireUser, AuthRequest } from '../middleware/auth';
import {
  generateOTP, generateMagicToken, saveOTP, verifyOTPToken,
  sendOTPEmail, sendMagicLinkEmail, sendOTPSMS,
} from '../middleware/otp';

const router = Router();

// ── POST /api/auth/send-otp ────────────────────────────────────
// Body: { method: 'email'|'phone', identifier: string, type: 'otp'|'magic_link' }
router.post('/send-otp', async (req: Request, res: Response) => {
  const { method, identifier, type = 'otp' } = req.body;

  if (!method || !identifier) {
    res.status(400).json({ error: 'method and identifier are required' });
    return;
  }

  // Log the attempt
  await query(
    `INSERT INTO login_attempts (method, type, identifier, status, ip_address, user_agent)
     VALUES ($1, $2, $3, 'pending', $4, $5)`,
    [method, type, identifier, req.ip, req.headers['user-agent'] || null]
  ).catch(console.error);

  try {
    if (type === 'magic_link' && method === 'email') {
      const token = generateMagicToken();
      await saveOTP(identifier, method, 'magic_link', token);
      await sendMagicLinkEmail(identifier, token);
      res.json({ message: 'Magic link sent to your email' });
    } else if (method === 'email') {
      const otp = generateOTP();
      await saveOTP(identifier, 'email', 'otp', otp);
      await sendOTPEmail(identifier, otp);
      res.json({ message: 'OTP sent to your email' });
    } else if (method === 'phone') {
      const otp = generateOTP();
      await saveOTP(identifier, 'phone', 'otp', otp);
      await sendOTPSMS(identifier, otp);
      res.json({ message: 'OTP sent to your phone' });
    } else {
      res.status(400).json({ error: 'Invalid method/type combination' });
    }
  } catch (err) {
    console.error('send-otp error:', err);
    res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────
// Body: { identifier: string, token: string }
router.post('/verify-otp', async (req: Request, res: Response) => {
  const { identifier, token } = req.body;
  if (!identifier || !token) {
    res.status(400).json({ error: 'identifier and token are required' });
    return;
  }

  const valid = await verifyOTPToken(identifier, token);
  if (!valid) {
    await query(
      `INSERT INTO login_attempts (method, type, identifier, status, ip_address)
       VALUES ('email', 'otp', $1, 'failed', $2)`,
      [identifier, req.ip]
    ).catch(console.error);
    res.status(401).json({ error: 'Invalid or expired code' });
    return;
  }

  // Upsert user
  const isEmail = identifier.includes('@');
  const field   = isEmail ? 'email' : 'phone';
  const rows    = await query<{ id: string; name: string | null }>(
    `INSERT INTO users (${field}, is_verified)
     VALUES ($1, TRUE)
     ON CONFLICT (${field}) DO UPDATE
       SET is_verified = TRUE, last_login = NOW()
     RETURNING id, name`,
    [identifier]
  );
  const user = rows[0];

  await query(
    `INSERT INTO login_attempts (method, type, identifier, status, ip_address)
     VALUES ($1, 'otp', $2, 'success', $3)`,
    [isEmail ? 'email' : 'phone', identifier, req.ip]
  ).catch(console.error);

  const jwtToken = jwt.sign(
    { sub: user.id, email: isEmail ? identifier : null },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as `${number}${'s'|'m'|'h'|'d'}` }
  );

  res.json({ token: jwtToken, user: { id: user.id, name: user.name, identifier } });
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', requireUser, async (req: AuthRequest, res: Response) => {
  const rows = await query<{ id: string; email: string; phone: string; name: string; created_at: string }>(
    `SELECT id, email, phone, name, created_at FROM users WHERE id = $1`,
    [req.userId]
  );
  if (rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(rows[0]);
});

export default router;
