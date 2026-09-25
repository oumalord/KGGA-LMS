import { neon } from "@neondatabase/serverless";

const databaseUrl = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be configured for the Neon database.");
}

const sql = neon(databaseUrl);
let schemaReady: Promise<void> | undefined;
const URL_CACHE_TTL_MS = 10 * 60 * 1000;
const URL_CACHE_MAX_ENTRIES = 100;
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const resourceUrlCache = new Map<string, { path: string; url: string; expiresAt: number }>();

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
      urlCache.delete(file.path);
      for (const [id, cached] of resourceUrlCache) {
        if (cached.path === file.path) resourceUrlCache.delete(id);
      }
      results.push(true);
    }
    return results;
  },

  async url(paths: string[]) {
    await ensureSchema();
    const urls: { url: string }[] = [];
    for (const path of paths) {
      const cached = urlCache.get(path);
      if (cached && cached.expiresAt > Date.now()) {
        urls.push({ url: cached.url });
        continue;
      }
      const [file] = await sql`SELECT content_base64, content_type FROM files WHERE path = ${path}`;
      if (!file) throw new Error(`Stored file not found: ${path}`);
      const url = `data:${file.content_type};base64,${file.content_base64}`;
      if (urlCache.size >= URL_CACHE_MAX_ENTRIES) {
        const oldestPath = urlCache.keys().next().value;
        if (oldestPath) urlCache.delete(oldestPath);
      }
      urlCache.set(path, { url, expiresAt: Date.now() + URL_CACHE_TTL_MS });
      urls.push({ url });
    }
    return urls;
  },

  async resourceUrl(id: string) {
    const cached = resourceUrlCache.get(id);
    if (cached && cached.expiresAt > Date.now()) return cached.url;

    const [file] = await sql.query(
      "SELECT files.path, files.content_base64, files.content_type FROM resources JOIN files ON files.path = resources.record->>'path' WHERE resources.id = $1::uuid",
      [id],
    );
    if (!file) return null;

    const url = `data:${file.content_type};base64,${file.content_base64}`;
    if (resourceUrlCache.size >= URL_CACHE_MAX_ENTRIES) {
      const oldestId = resourceUrlCache.keys().next().value;
      if (oldestId) resourceUrlCache.delete(oldestId);
    }
    resourceUrlCache.set(id, { path: file.path as string, url, expiresAt: Date.now() + URL_CACHE_TTL_MS });
    return url;
  },

  async delete(paths: string[]) {
    await ensureSchema();
    await sql`DELETE FROM files WHERE path = ANY(${paths}::text[])`;
    for (const path of paths) urlCache.delete(path);
    for (const [id, cached] of resourceUrlCache) {
      if (paths.includes(cached.path)) resourceUrlCache.delete(id);
    }
  },
};