import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import adminAuthRoutes   from './routes/adminAuth';
import authRoutes        from './routes/auth';
import contactRoutes     from './routes/contact';
import servicesRoutes    from './routes/services';
import galleryRoutes     from './routes/gallery';
import productsRoutes    from './routes/products';
import analyticsRoutes   from './routes/analytics';
import socialLinksRoutes from './routes/social-links';

dotenv.config();

const app  = express();
app.set('trust proxy', 1);  // ← ADD THIS
const PORT = Number(process.env.PORT) || 4000;

// ── Security & parsing ────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: ['https://manikyamoneyservice.com', 'https://www.manikyamoneyservice.com', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // 10 MB allows base64 images

// ── Rate limiting ─────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Stricter for auth endpoints
  message: { error: 'Too many auth attempts, please wait 15 minutes.' },
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/admin', authLimiter);

// ── Routes ────────────────────────────────────────────────────
app.use('/api/admin',        adminAuthRoutes);
app.use('/api/auth',         authRoutes);
app.use('/api/contact',      contactRoutes);
app.use('/api/services',     servicesRoutes);
app.use('/api/gallery',      galleryRoutes);
app.use('/api/products',     productsRoutes);
app.use('/api/analytics',    analyticsRoutes);
app.use('/api/social-links', socialLinksRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀  Manikya backend running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

export default app;
