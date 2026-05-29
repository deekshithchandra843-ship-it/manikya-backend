const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: 'dpg-d8alljfavr4c73dmf240-a.singapore-postgres.render.com',
  port: 5432,
  database: 'manikya_db_biko',
  user: 'manikya_db_biko_user',
  password: 'XnZn7Q4jGGA94nHAy7QZSdUiM8bT4Vc1',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const hash = await bcrypt.hash('password', 12);
    
    // Delete old admin and insert correct one
    await pool.query(`DELETE FROM admin_users`);
    await pool.query(
      `INSERT INTO admin_users (email, password_hash, name) VALUES ($1, $2, $3)`,
      ['manikyamoneyservices@gmail.com', hash, 'Admin']
    );
    
    console.log('✅ Admin credentials updated!');
    console.log('Email: manikyamoneyservices@gmail.com');
    console.log('Password: password');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
