/**
 * Seed script — run once after applying schema.sql
 * Usage: npx ts-node src/db/seed.ts
 */
import bcrypt from 'bcryptjs';
import { pool, query } from './pool';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
  const email    = process.env.ADMIN_EMAIL    || 'admin@manikya.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const name     = 'Manikya Admin';

  const hash = await bcrypt.hash(password, 12);

  await query(
    `INSERT INTO admin_users (email, password_hash, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE
       SET password_hash = $2, name = $3`,
    [email, hash, name]
  );

  console.log(`✅  Admin user seeded`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`\n⚠️  Change the admin password after first login!\n`);

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
