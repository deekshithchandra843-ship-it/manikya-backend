const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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
    const sqlPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running schema on Render database...');
    await pool.query(sql);
    console.log('All tables created successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
