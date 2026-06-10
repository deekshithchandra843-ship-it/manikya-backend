import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import adminAuthRoutes from './routes/adminAuth';
import authRoutes      from './routes/auth';
import contactRoutes   from './routes/contact';
import servicesRoutes  from './routes/services';
import galleryRoutes   from './routes/gallery';
import productsRoutes  from './routes/products';
import analyticsRoutes from './routes/analytics';
import videosRoutes    from './routes/videos';
import socialLinksRoutes from './routes/social-links';
import { query }       from './db/pool';

dotenv.config();

const app  = express();
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT) || 4000;

// ── Auto-create tables if they don't exist ────────────────────
async function runMigrations() {
  await query(`
    CREATE TABLE IF NOT EXISTS video_items (
      id            SERIAL PRIMARY KEY,
      video_key     TEXT UNIQUE NOT NULL,
      label         TEXT NOT NULL,
      tab           TEXT NOT NULL DEFAULT 'company',
      video_data    TEXT,
      is_active     BOOLEAN NOT NULL DEFAULT TRUE,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✅ Migrations complete');
}

app.use(helmet());
app.use(cors({
  origin: ['https://manikyamoneyservice.com', 'https://www.manikyamoneyservice.com', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts, please wait 15 minutes.' },
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/admin', authLimiter);

app.use('/api/admin',     adminAuthRoutes);
app.use('/api/auth',      authRoutes);
app.use('/api/contact',   contactRoutes);
app.use('/api/services',  servicesRoutes);
app.use('/api/gallery',   galleryRoutes);
app.use('/api/products',  productsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/videos',    videosRoutes);
app.use('/api/social-links', socialLinksRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start server after migrations ─────────────────────────────
runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀  Manikya backend running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  });
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

export default app;
