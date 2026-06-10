import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

const DEFAULT_SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/newsjunctiondigital?igsh=eGd5czZldWdsMDEw',
  facebook:  'https://www.facebook.com/share/18cqpxCY8w/',
  youtube:   'https://youtube.com/@newsjunctiondigital?si=Qb5X358zSsEwiOrZ',
  maps:      'https://maps.google.com/?q=215+MGES+5th+Main+Road+RPC+Layout+Hampi+Nagar+Bengaluru+560104',
};

// ── DB SETUP ──────────────────────────────────────────────────────────────────
// Run this once to create the table (called automatically on first request):
//
//   CREATE TABLE IF NOT EXISTS site_settings (
//     key   TEXT PRIMARY KEY,
//     value TEXT NOT NULL
//   );
//
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

// GET /api/social-links  — public, no auth needed
router.get('/', async (_req: Request, res: Response) => {
  try {
    await ensureTable();
    const rows = await query<{ value: string }>(
      `SELECT value FROM site_settings WHERE key = 'social_links'`
    );
    if (rows.length === 0) {
      res.json(DEFAULT_SOCIAL_LINKS);
      return;
    }
    res.json(JSON.parse(rows[0].value));
  } catch (err) {
    console.error('social-links GET error:', err);
    res.json(DEFAULT_SOCIAL_LINKS); // fallback to defaults on error
  }
});

// PUT /api/social-links  — admin only
router.put('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { instagram, facebook, youtube, maps } = req.body;

  if (!instagram || !facebook || !youtube || !maps) {
    res.status(400).json({ error: 'All four links are required: instagram, facebook, youtube, maps' });
    return;
  }

  const value = JSON.stringify({ instagram, facebook, youtube, maps });

  try {
    await ensureTable();
    await query(
      `INSERT INTO site_settings (key, value)
       VALUES ('social_links', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [value]
    );
    res.json({ message: 'Social links updated successfully', links: { instagram, facebook, youtube, maps } });
  } catch (err) {
    console.error('social-links PUT error:', err);
    res.status(500).json({ error: 'Failed to save social links. Please try again.' });
  }
});

export default router;
