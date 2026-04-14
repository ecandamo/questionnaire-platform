import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { defineConfig } from "drizzle-kit"

/**
 * drizzle-kit does not load `.env.local` (Next.js does). Read DATABASE_URL from
 * env files so `npm run db:push` works the same as the app dev server.
 */
function ensureDatabaseUrlFromEnvFiles(): void {
  if (process.env.DATABASE_URL?.trim()) return
  for (const name of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), name)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const m = trimmed.match(/^DATABASE_URL\s*=\s*(.*)$/)
      if (!m) continue
      let v = m[1]!.trim()
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1)
      }
      process.env.DATABASE_URL = v
      return
    }
  }
}

ensureDatabaseUrlFromEnvFiles()

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error(
    "DATABASE_URL is missing. Add it to .env.local (or .env), or export it in your shell before running drizzle-kit.",
  )
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
})
