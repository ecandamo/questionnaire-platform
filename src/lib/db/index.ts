import { Pool } from "@neondatabase/serverless"
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless"
import * as schema from "./schema"

type DB = NeonDatabase<typeof schema>

function createPool(): Pool {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  return new Pool({ connectionString: url })
}

// Lazy singleton pool — instantiated on first use, not at module load
let _pool: Pool | undefined
let _db: DB | undefined

export function getDb(): DB {
  if (!_db) {
    _pool = createPool()
    _db = drizzle(_pool, { schema })
  }
  return _db
}

export const db = new Proxy({} as DB, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getDb() as any)[prop]
  },
})

export type { DB }
