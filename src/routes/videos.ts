import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// ── GET /api/videos (public) — all active videos ─────────────
router.get('/', async (_req: Request, res: Response) => {
  const rows = await query(
    `SELECT id, video_key, label, tab, video_data, display_order
     FROM video_items
     WHERE is_active = TRUE
     ORDER BY display_order ASC`
  );
  res.json(rows);
});

// ── POST /api/videos (admin) — upsert video by key ───────────
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { video_key, label, tab, video_data, display_order } = req.body;
  if (!video_key || !video_data) {
    res.status(400).json({ error: 'video_key and video_data are required' });
    return;
  }

  // Upsert: if key exists update it, else insert
  const rows = await query<{ id: number }>(
    `INSERT INTO video_items (video_key, label, tab, video_data, display_order)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (video_key)
     DO UPDATE SET
       video_data    = EXCLUDED.video_data,
       label         = COALESCE(EXCLUDED.label, video_items.label),
       tab           = COALESCE(EXCLUDED.tab,   video_items.tab),
       display_order = COALESCE(EXCLUDED.display_order, video_items.display_order),
       updated_at    = NOW()
     RETURNING id`,
    [video_key, label || video_key, tab || 'company', video_data, display_order || 0]
  );
  res.status(201).json({ id: rows[0].id, message: 'Video saved' });
});

// ── DELETE /api/videos/:key (admin) — remove video by key ────
router.delete('/:key', requireAdmin, async (req: AuthRequest, res: Response) => {
  await query(
    `UPDATE video_items SET video_data = NULL, is_active = FALSE WHERE video_key = $1`,
    [req.params.key]
  );
  res.json({ message: 'Video removed' });
});

export default router;
