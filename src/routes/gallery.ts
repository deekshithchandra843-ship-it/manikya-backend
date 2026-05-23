import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// ── GET /api/gallery (public) ─────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  const rows = await query(
    `SELECT id, title, category, image_url, image_data, color, display_order
     FROM gallery_items
     WHERE is_active = TRUE
     ORDER BY display_order ASC, created_at ASC`
  );
  res.json(rows);
});

// ── GET /api/gallery/all (admin) ──────────────────────────────
router.get('/all', requireAdmin, async (_req: AuthRequest, res: Response) => {
  const rows = await query(
    `SELECT id, title, category, image_url, image_data, color, is_active, display_order, created_at, updated_at
     FROM gallery_items ORDER BY display_order ASC`
  );
  res.json(rows);
});

// ── POST /api/gallery (admin) — add new gallery item ──────────
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { title, category, image_url, image_data, color, display_order } = req.body;
  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  const rows = await query<{ id: number }>(
    `INSERT INTO gallery_items (title, category, image_url, image_data, color, display_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [title, category || 'General', image_url || null, image_data || null, color || '#8B6914', display_order || 0]
  );
  res.status(201).json({ id: rows[0].id, message: 'Gallery item created' });
});

// ── PUT /api/gallery/:id/image (admin) — upload base64 image ──
// In production, upload to S3/Cloudflare R2 and store the URL instead.
router.put('/:id/image', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { image_data, image_url } = req.body;
  if (!image_data && !image_url) {
    res.status(400).json({ error: 'image_data or image_url is required' });
    return;
  }
  await query(
    `UPDATE gallery_items
     SET image_data = $1, image_url = $2
     WHERE id = $3`,
    [image_data || null, image_url || null, req.params.id]
  );
  res.json({ message: 'Image updated' });
});

// ── PUT /api/gallery/:id (admin) — update metadata ────────────
router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { title, category, color, is_active, display_order } = req.body;
  await query(
    `UPDATE gallery_items
     SET title         = COALESCE($1, title),
         category      = COALESCE($2, category),
         color         = COALESCE($3, color),
         is_active     = COALESCE($4, is_active),
         display_order = COALESCE($5, display_order)
     WHERE id = $6`,
    [title || null, category || null, color || null, is_active ?? null, display_order ?? null, req.params.id]
  );
  res.json({ message: 'Gallery item updated' });
});

// ── DELETE /api/gallery/:id (admin) ──────────────────────────
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  await query(`DELETE FROM gallery_items WHERE id = $1`, [req.params.id]);
  res.json({ message: 'Gallery item deleted' });
});

export default router;
