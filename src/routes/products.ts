import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// ── GET /api/products (public) ────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  const rows = await query(
    `SELECT id, name, description, category, price, image_url, display_order
     FROM products
     WHERE is_available = TRUE
     ORDER BY display_order ASC, created_at ASC`
  );
  res.json(rows);
});

// ── GET /api/products/all (admin — includes unavailable) ──────
router.get('/all', requireAdmin, async (_req: AuthRequest, res: Response) => {
  const rows = await query(
    `SELECT id, name, description, category, price, image_url, is_available, display_order, created_at, updated_at
     FROM products ORDER BY display_order ASC`
  );
  res.json(rows);
});

// ── POST /api/products (admin) ────────────────────────────────
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { name, description, category, price, image_url, display_order } = req.body;
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const rows = await query<{ id: number }>(
    `INSERT INTO products (name, description, category, price, image_url, display_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [name, description || null, category || 'General', price || null, image_url || null, display_order || 0]
  );
  res.status(201).json({ id: rows[0].id, message: 'Product created' });
});

// ── PUT /api/products/:id (admin) ────────────────────────────
router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { name, description, category, price, image_url, is_available, display_order } = req.body;
  await query(
    `UPDATE products
     SET name          = COALESCE($1, name),
         description   = COALESCE($2, description),
         category      = COALESCE($3, category),
         price         = COALESCE($4, price),
         image_url     = COALESCE($5, image_url),
         is_available  = COALESCE($6, is_available),
         display_order = COALESCE($7, display_order)
     WHERE id = $8`,
    [name || null, description || null, category || null, price ?? null, image_url || null, is_available ?? null, display_order ?? null, req.params.id]
  );
  res.json({ message: 'Product updated' });
});

// ── DELETE /api/products/:id (admin) ─────────────────────────
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  await query(`DELETE FROM products WHERE id = $1`, [req.params.id]);
  res.json({ message: 'Product deleted' });
});

export default router;
