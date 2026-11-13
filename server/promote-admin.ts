import 'dotenv/config';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
if (!databaseUrl || !email) {
  throw new Error('Set DATABASE_URL and BOOTSTRAP_ADMIN_EMAIL for this one-time administrative operation.');
}
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
});
try {
  const result = await pool.query(
    "UPDATE app_users SET role='admin' WHERE lower(email)=$1 AND role='customer' RETURNING id,email,role",
    [email]
  );
  if (!result.rowCount) {
    const existing = await pool.query('SELECT id,email,role FROM app_users WHERE lower(email)=$1',[email]);
    if (!existing.rowCount) throw new Error('No registered user found for BOOTSTRAP_ADMIN_EMAIL.');
    if (existing.rows[0].role !== 'admin') throw new Error('Account exists but is not a customer; review its role manually.');
    console.log('The account is already an administrator:',existing.rows[0].email);
  } else {
    console.log('Administrator role granted:',result.rows[0].email);
  }
} finally {
  await pool.end();
}
