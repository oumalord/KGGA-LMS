import { neon } from "@neondatabase/serverless";

const databaseUrl = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be configured for the Neon database.");
}

const sql = neon(databaseUrl);
let schemaReady: Promise<void> | undefined;

function ensureSchema() {
  schemaReady ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS files (
      path TEXT PRIMARY KEY,
      content_base64 TEXT NOT NULL,
      content_type TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  })();
  return schemaReady;
}

export const storage = {
  async write(files: { path: string; content: string; contentType: string }[]) {
    await ensureSchema();
    const results: boolean[] = [];
    for (const file of files) {
      await sql`INSERT INTO files (path, content_base64, content_type)
        VALUES (${file.path}, ${file.content}, ${file.contentType})
        ON CONFLICT (path) DO UPDATE SET content_base64 = EXCLUDED.content_base64, content_type = EXCLUDED.content_type, created_at = NOW()`;
      results.push(true);
    }
    return results;
  },

  async url(paths: string[]) {
    await ensureSchema();
    const urls: { url: string }[] = [];
    for (const path of paths) {
      const [file] = await sql`SELECT content_base64, content_type FROM files WHERE path = ${path}`;
      if (!file) throw new Error(`Stored file not found: ${path}`);
      urls.push({ url: `data:${file.content_type};base64,${file.content_base64}` });
    }
    return urls;
  },

  async delete(paths: string[]) {
    await ensureSchema();
    await sql`DELETE FROM files WHERE path = ANY(${paths}::text[])`;
  },
};