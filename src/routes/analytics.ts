import { Router, Response } from 'express';
import { query } from '../db/pool';
import { requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// ── GET /api/analytics/logins (admin) ────────────────────────
router.get('/logins', requireAdmin, async (_req: AuthRequest, res: Response) => {
  const attempts = await query(
    `SELECT id, method, type, identifier, status, ip_address, created_at
     FROM login_attempts
     ORDER BY created_at DESC
     LIMIT 500`
  );

  // Summary stats
  const stats = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::int AS count
     FROM login_attempts
     GROUP BY status`
  );

  // Daily trend (last 30 days)
  const trend = await query(
    `SELECT DATE(created_at) AS date,
            COUNT(*) FILTER (WHERE status = 'success') AS success,
            COUNT(*) FILTER (WHERE status = 'failed')  AS failed,
            COUNT(*) FILTER (WHERE status = 'pending') AS pending
     FROM login_attempts
     WHERE created_at > NOW() - INTERVAL '30 days'
     GROUP BY DATE(created_at)
     ORDER BY date ASC`
  );

  res.json({ attempts, stats, trend });
});

// ── GET /api/analytics/overview (admin) ──────────────────────
router.get('/overview', requireAdmin, async (_req: AuthRequest, res: Response) => {
  const [services, contacts, gallery, products, users, leads] = await Promise.all([
    query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM services WHERE is_active = TRUE`),
    query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM contact_leads`),
    query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM gallery_items WHERE is_active = TRUE`),
    query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM products WHERE is_available = TRUE`),
    query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM users WHERE is_verified = TRUE`),
    query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM contact_leads WHERE status = 'new'`),
  ]);
  res.json({
    services:      services[0].count,
    contacts:      contacts[0].count,
    gallery:       gallery[0].count,
    products:      products[0].count,
    verified_users: users[0].count,
    new_leads:     leads[0].count,
  });
});

export default router;
