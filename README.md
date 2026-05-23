# Manikya Backend — Setup Guide

## What's included

| File | Purpose |
|---|---|
| `src/index.ts` | Express server entry point |
| `src/db/schema.sql` | PostgreSQL tables + seed data |
| `src/db/pool.ts` | PostgreSQL connection pool |
| `src/db/seed.ts` | Creates the admin user |
| `src/routes/adminAuth.ts` | Admin login, change-password |
| `src/routes/auth.ts` | User OTP + magic-link auth |
| `src/routes/contact.ts` | Contact form + admin leads |
| `src/routes/services.ts` | Services CRUD |
| `src/routes/gallery.ts` | Gallery CRUD + image upload |
| `src/routes/products.ts` | Products CRUD |
| `src/routes/analytics.ts` | Login analytics + overview |
| `src/middleware/auth.ts` | JWT verification middleware |
| `src/middleware/otp.ts` | OTP generate, send, verify |
| `frontend-api-client/api.ts` | Drop into your React src/lib/ |

---

## Step 1 — Install PostgreSQL

```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib

# macOS (Homebrew)
brew install postgresql@16 && brew services start postgresql@16
```

---

## Step 2 — Create the database

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE manikya_db;
CREATE USER manikya_user WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE manikya_db TO manikya_user;
\q
```

---

## Step 3 — Apply the schema

```bash
psql -U manikya_user -d manikya_db -f src/db/schema.sql
```

This creates all tables and inserts seed services, gallery items, and products.

---

## Step 4 — Configure environment

```bash
cp .env.example .env
# Edit .env with your DB credentials, SMTP settings, and JWT secrets
```

Minimum required values:
```
DB_USER=manikya_user
DB_PASSWORD=your_strong_password
JWT_SECRET=<any long random string>
ADMIN_JWT_SECRET=<another long random string>
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
```

> **Gmail tip:** Use an App Password, not your main password.  
> Google Account → Security → 2-Step Verification → App Passwords

---

## Step 5 — Seed the admin user

```bash
npm run seed
```

This creates `admin@manikya.com` with password `Admin@1234`.  
**Change the password after first login.**

---

## Step 6 — Start the backend

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm run build && npm start
```

Server starts at **http://localhost:4000**

---

## Step 7 — Connect the React frontend

1. Copy `frontend-api-client/api.ts` → `src/lib/api.ts` in your React project

2. Add to your React project's `.env`:
   ```
   VITE_API_URL=http://localhost:4000/api
   ```

3. Replace demo code in your pages:

### AdminLogin.tsx
```typescript
import { adminAuth } from '@/lib/api';

// Replace the handleSubmit simulation:
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await adminAuth.login(credentials.email, credentials.password);
    navigate('/admin/dashboard');
  } catch (err: any) {
    setError(err.message);
  }
};
```

### auth/Login.tsx
```typescript
import { auth } from '@/lib/api';

// Replace the setTimeout simulation:
const handleEmailLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
    await auth.sendOTP('email', email, useMagicLink ? 'magic_link' : 'otp');
    setMessage('✓ Code sent! Check your email.');
    if (!useMagicLink) navigate('/auth/verify-otp', { state: { email } });
  } catch (err: any) {
    setMessage(`Error: ${err.message}`);
  } finally {
    setLoading(false);
  }
};
```

### auth/VerifyOTP.tsx
```typescript
import { auth } from '@/lib/api';

const handleVerify = async () => {
  try {
    await auth.verifyOTP(email || phone, otp.join(''));
    navigate('/');
  } catch (err: any) {
    setError(err.message);
  }
};
```

### Contact.tsx
```typescript
import { contact } from '@/lib/api';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSending(true);
  try {
    await contact.submit(form);
    setSent(true);
  } catch (err: any) {
    setMessage(`Error: ${err.message}`);
  } finally {
    setSending(false);
  }
};
```

### AdminDashboard.tsx
```typescript
import { services as servicesApi, contact as contactApi } from '@/lib/api';

useEffect(() => {
  servicesApi.getAllAdmin().then(setServices);
  contactApi.getAll().then(setContactLeads);
}, []);

const handleAddService = async () => {
  await servicesApi.create(newService);
  const updated = await servicesApi.getAllAdmin();
  setServices(updated);
};
```

### Gallery.tsx
```typescript
import { gallery as galleryApi } from '@/lib/api';

// Load from DB instead of localStorage:
useEffect(() => {
  galleryApi.getAll().then((items) => {
    const imageMap: Record<number, string> = {};
    items.forEach(item => {
      if (item.image_data) imageMap[item.id] = item.image_data;
    });
    setImages(imageMap);
  });
}, []);

// Save uploaded image to DB:
const handleUpload = async (id: number, base64: string) => {
  await galleryApi.updateImage(id, base64);
};
```

---

## API Reference

### Public endpoints (no auth needed)
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/send-otp` | Send OTP or magic link |
| POST | `/api/auth/verify-otp` | Verify OTP, returns JWT |
| POST | `/api/contact` | Submit contact form |
| GET | `/api/services` | List active services |
| GET | `/api/gallery` | List active gallery items |
| GET | `/api/products` | List available products |
| GET | `/api/health` | Health check |

### User-protected endpoints (Bearer user token)
| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/me` | Get current user |

### Admin-protected endpoints (Bearer admin token)
| Method | Path | Description |
|---|---|---|
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/me` | Admin profile |
| POST | `/api/admin/change-password` | Change password |
| GET | `/api/contact` | All contact leads |
| PATCH | `/api/contact/:id/status` | Update lead status |
| DELETE | `/api/contact/:id` | Delete lead |
| GET | `/api/services/all` | All services (incl. inactive) |
| POST | `/api/services` | Create service |
| PUT | `/api/services/:id` | Update service |
| DELETE | `/api/services/:id` | Delete service |
| GET | `/api/gallery/all` | All gallery items |
| POST | `/api/gallery` | Add gallery item |
| PUT | `/api/gallery/:id/image` | Upload image (base64) |
| PUT | `/api/gallery/:id` | Update metadata |
| DELETE | `/api/gallery/:id` | Delete item |
| GET | `/api/products/all` | All products |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| GET | `/api/analytics/logins` | Login analytics |
| GET | `/api/analytics/overview` | Dashboard stats |

---

## Production checklist

- [ ] Change `ADMIN_PASSWORD` in `.env` and re-run `npm run seed`
- [ ] Use strong, unique values for `JWT_SECRET` and `ADMIN_JWT_SECRET`
- [ ] Set `NODE_ENV=production`
- [ ] Use a managed PostgreSQL service (Railway, Supabase, RDS, Neon)
- [ ] Add Twilio credentials for real SMS OTP (`src/middleware/otp.ts`)
- [ ] Move gallery images to S3/Cloudflare R2 (replace `image_data` with `image_url`)
- [ ] Put the backend behind Nginx with HTTPS
- [ ] Set `FRONTEND_URL` to your production domain in CORS config
