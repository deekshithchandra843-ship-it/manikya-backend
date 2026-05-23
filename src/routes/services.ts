import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// ── GET /api/services (public) ────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  const rows = await query(
    `SELECT id, title, description, icon, display_order, created_at
     FROM services
     WHERE is_active = TRUE
     ORDER BY display_order ASC, created_at ASC`
  );
  res.json(rows);
});

// ── GET /api/services/all (admin — includes inactive) ─────────
router.get('/all', requireAdmin, async (_req: AuthRequest, res: Response) => {
  const rows = await query(
    `SELECT id, title, description, icon, is_active, display_order, created_at, updated_at
     FROM services ORDER BY display_order ASC`
  );
  res.json(rows);
});

// ── POST /api/services (admin) ────────────────────────────────
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { title, description, icon, display_order } = req.body;
  if (!title || !description) {
    res.status(400).json({ error: 'title and description are required' });
    return;
  }
  const rows = await query<{ id: number }>(
    `INSERT INTO services (title, description, icon, display_order)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [title, description, icon || null, display_order || 0]
  );
  res.status(201).json({ id: rows[0].id, message: 'Service created' });
});

// ── PUT /api/services/:id (admin) ─────────────────────────────
router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { title, description, icon, is_active, display_order } = req.body;
  await query(
    `UPDATE services
     SET title         = COALESCE($1, title),
         description   = COALESCE($2, description),
         icon          = COALESCE($3, icon),
         is_active     = COALESCE($4, is_active),
         display_order = COALESCE($5, display_order)
     WHERE id = $6`,
    [title || null, description || null, icon || null, is_active ?? null, display_order ?? null, req.params.id]
  );
  res.json({ message: 'Service updated' });
});

// ── DELETE /api/services/:id (admin) ──────────────────────────
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  await query(`DELETE FROM services WHERE id = $1`, [req.params.id]);
  res.json({ message: 'Service deleted' });
});

export default router;
