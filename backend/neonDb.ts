import { neon } from "@neondatabase/serverless";

type RecordWithId = { id: string; [key: string]: unknown };

const databaseUrl = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be configured for the Neon database.");
}

const sql = neon(databaseUrl);
let schemaReady: Promise<void> | undefined;

const collectionTables = {
  users: "users",
  audit_log: "audit_log",
  badges: "badges",
  settings: "settings",
  courses: "courses",
  enrollments: "enrollments",
  purchases: "purchases",
  surveys: "surveys",
  certificates: "certificates",
  notes: "notes",
  submissions: "submissions",
  events: "events",
  event_registrations: "event_registrations",
  resources: "resources",
  kgga_videos: "kgga_videos",
} as const;

function tableFor(collection: string) {
  const table = collectionTables[collection as keyof typeof collectionTables];
  if (!table) throw new Error(`Unsupported collection: ${collection}`);
  return table;
}

function ensureSchema() {
  schemaReady ??= (async () => {
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
    for (const table of Object.values(collectionTables)) {
      await sql.query(`CREATE TABLE IF NOT EXISTS ${table} (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
      await sql.query(`CREATE INDEX IF NOT EXISTS ${table}_record_idx ON ${table} USING GIN (record)`);
    }
  })();
  return schemaReady;
}

function normalizeRecord(id: string, record: unknown): RecordWithId {
  return { id, ...(record as object) };
}

export const db = {
  async list<T = RecordWithId>(
    collection: string,
    options: { filter?: Record<string, unknown>; limit?: number } = {},
  ) {
    await ensureSchema();
    const table = tableFor(collection);
    const limit = options.limit ?? 100;
    const filter = options.filter ? JSON.stringify(options.filter) : null;
    const rows = filter
      ? await sql.query(`SELECT id::text, record FROM ${table} WHERE record @> $1::jsonb ORDER BY created_at LIMIT $2`, [filter, limit])
      : await sql.query(`SELECT id::text, record FROM ${table} ORDER BY created_at LIMIT $1`, [limit]);
    return { items: rows.map((row) => normalizeRecord(row.id as string, row.record) as T) };
  },

  async get<T = RecordWithId>(collection: string, ids: string[]) {
    await ensureSchema();
    const table = tableFor(collection);
    const rows = await sql.query(`SELECT id::text, record FROM ${table} WHERE id = ANY($1::uuid[])`, [ids]);
    const recordsById = new Map(rows.map((row) => [row.id as string, normalizeRecord(row.id as string, row.record) as T]));
    return ids.map((id) => recordsById.get(id) ?? null);
  },

  async add(collection: string, records: object[]) {
    await ensureSchema();
    const table = tableFor(collection);
    const ids: string[] = [];
    for (const record of records) {
      const [row] = await sql.query(`INSERT INTO ${table} (record) VALUES ($1::jsonb) RETURNING id::text`, [JSON.stringify(record)]);
      ids.push(row.id as string);
    }
    return ids;
  },

  async update(collection: string, updates: { id: string; record: object }[]) {
    await ensureSchema();
    const table = tableFor(collection);
    const updated: boolean[] = [];
    for (const update of updates) {
      const rows = await sql.query(`UPDATE ${table} SET record = $1::jsonb WHERE id = $2::uuid RETURNING id`, [JSON.stringify(update.record), update.id]);
      updated.push(rows.length > 0);
    }
    return updated;
  },

  async delete(collection: string, ids: string[]) {
    await ensureSchema();
    const table = tableFor(collection);
    await sql.query(`DELETE FROM ${table} WHERE id = ANY($1::uuid[])`, [ids]);
  },
};