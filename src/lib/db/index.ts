import { neon } from "@neondatabase/serverless"
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http"
import * as schema from "./schema"

type DB = NeonHttpDatabase<typeof schema> & { $client: ReturnType<typeof neon> }

function createDb(): DB {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  const sql = neon(url)
  return drizzle(sql, { schema }) as DB
}

// Lazy singleton — instantiated on first use, not at module load
let _db: DB | undefined

export function getDb(): DB {
  if (!_db) _db = createDb()
  return _db
}

export const db = new Proxy({} as DB, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getDb() as any)[prop]
  },
})

export type { DB }
