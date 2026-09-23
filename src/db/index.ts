import { drizzle } from 'drizzle-orm/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

let dbInstance: any = null;
let rawClient: any = null;

export async function getDb() {
  if (dbInstance) {
    return { db: dbInstance, client: rawClient };
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.trim().length > 0) {
    // Production / Staging Neon PostgreSQL connection
    const pool = new pg.Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 10,
    });
    rawClient = pool;
    dbInstance = drizzlePg(pool, { schema });
    return { db: dbInstance, client: rawClient };
  }

  // Local development / fallback zero-config embedded PostgreSQL
  const dbDir = path.resolve(process.cwd(), '.pgdata');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const pglite = new PGlite(dbDir);
  rawClient = pglite;
  dbInstance = drizzle(pglite, { schema });

  return { db: dbInstance, client: rawClient };
}

// Helper to run raw SQL script or query across both PGlite and pg.Pool
export async function executeSql(queryText: string, params: any[] = []): Promise<{ rows: any[] }> {
  const { client } = await getDb();
  if ('query' in client) {
    try {
      const result = await client.query(queryText, params);
      if (Array.isArray(result)) {
        return { rows: result[0]?.rows || [] };
      }
      return { rows: result.rows || [] };
    } catch (err: any) {
      // If client is pglite and query failed on multi-statement, fallback to exec
      if ('exec' in client && typeof client.exec === 'function') {
        const execRes = await client.exec(queryText);
        if (Array.isArray(execRes)) {
          return { rows: execRes[execRes.length - 1]?.rows || [] };
        }
        return { rows: (execRes as any)?.rows || [] };
      }
    }
  }
  throw new Error('Unsupported database client');
}

// Transaction Helper
export async function withTransaction<T>(
  callback: (txQuery: (text: string, params?: any[]) => Promise<{ rows: any[] }>) => Promise<T>
): Promise<T> {
  const { client } = await getDb();

  // 1. Connection Pool (Neon PostgreSQL)
  if ('connect' in client && typeof client.connect === 'function') {
    const conn = await client.connect();
    try {
      await conn.query('BEGIN;');
      const txQuery = async (text: string, params: any[] = []) => {
        const res = await conn.query(text, params);
        return { rows: res.rows || [] };
      };
      const result = await callback(txQuery);
      await conn.query('COMMIT;');
      return result;
    } catch (err) {
      try {
        await conn.query('ROLLBACK;');
      } catch {
        // ignore rollback error
      }
      throw err;
    } finally {
      conn.release();
    }
  }

  // 2. Embedded PGlite
  if ('transaction' in client && typeof client.transaction === 'function') {
    return await client.transaction(async (tx: any) => {
      const txQuery = async (text: string, params: any[] = []) => {
        const res = await tx.query(text, params);
        if (Array.isArray(res)) return { rows: res[0]?.rows || [] };
        return { rows: res.rows || [] };
      };
      return await callback(txQuery);
    });
  }

  throw new Error('Unsupported database client for transactions');
}



