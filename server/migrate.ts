import 'dotenv/config';
import { Pool } from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
});
const here = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(here,'../db/migrations/001_initial_schema.sql');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
    const directory = path.dirname(migrationPath);
    const files = (await readdir(directory)).filter((name) => /^\d+_[a-z0-9_-]+\.sql$/i.test(name)).sort();
    for (const file of files) {
      const version = file.replace(/\.sql$/i,'');
      const existing = await client.query('SELECT version FROM schema_migrations WHERE version=$1',[version]);
      if (existing.rowCount) {
        console.log('Migration ' + version + ' already applied.');
        continue;
      }
      const sql = await readFile(path.join(directory,file),'utf8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)',[version]);
      console.log('Migration ' + version + ' applied successfully.');
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
migrate().catch((error) => {
  console.error('Database migration failed:',error);
  process.exitCode = 1;
});
