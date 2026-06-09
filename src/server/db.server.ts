// Server-only MySQL pool. Reads connection config from env at first use so
// the app stays portable: set DATABASE_URL on your hosting and you're done.
// No code changes required when moving between environments.
import mysql, { type Pool, type PoolOptions, type RowDataPacket, type ResultSetHeader } from "mysql2/promise";

let _pool: Pool | null = null;

function buildPoolOptions(): PoolOptions {
  const url = process.env.DATABASE_URL;
  const base: PoolOptions = {
    connectionLimit: 10,
    waitForConnections: true,
    dateStrings: true,
    timezone: "Z",
    charset: "utf8mb4",
  };
  if (url) return { ...base, uri: url };
  // Fallback to discrete vars
  return {
    ...base,
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "bpn_jakbar",
  };
}

export function getPool(): Pool {
  if (_pool) return _pool;
  _pool = mysql.createPool(buildPoolOptions());
  return _pool;
}

export async function q<T = RowDataPacket>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(sql, params);
  return rows as unknown as T[];
}

export async function exec(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [res] = await getPool().query<ResultSetHeader>(sql, params);
  return res;
}

export function newUuid(): string {
  // RFC 4122 v4 — works in any runtime that has crypto.randomUUID
  return crypto.randomUUID();
}
