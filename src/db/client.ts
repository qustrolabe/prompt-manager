/**
 * Database Client for Tauri SQL Plugin with Drizzle ORM
 * Uses sqlite-proxy adapter to work with Tauri's SQL plugin
 */

import Database from "@tauri-apps/plugin-sql";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema.ts";

// Database name for SQLite file
const DB_NAME = "sqlite:data.db";

// Type for SQLite table column information from PRAGMA table_info
export interface TableColumn {
  cid: number; // Column ID
  name: string; // Column name
  type: string; // Column type
  notnull: number; // 0 if column can be null, 1 if not
  dflt_value: unknown; // Default value
  pk: number; // 1 if column is part of primary key, 0 otherwise
}

// Singleton database instance and initialization promise
let db: Database | null = null;
let initPromise: Promise<Database> | null = null;
let drizzleDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Get the raw Tauri SQL database connection
 */
export async function getDatabase(): Promise<Database> {
  if (db) return db;

  if (!initPromise) {
    initPromise = (async () => {
      const _db = await Database.load(DB_NAME);
      await initializeMigrations(_db);
      db = _db;
      return _db;
    })();
  }

  return initPromise;
}

/**
 * Get the Drizzle ORM instance configured with sqlite-proxy
 */
export async function getDrizzle() {
  if (!drizzleDb) {
    const database = await getDatabase();

    drizzleDb = drizzle<typeof schema>(
      async (sql, params, method) => {
        try {
          if (method === "run") {
            // For INSERT, UPDATE, DELETE operations
            await database.execute(sql, params as unknown[]);
            return { rows: [] as unknown[][] };
          } else {
            // For SELECT operations
            const rows = await database.select<Record<string, unknown>[]>(sql, params as unknown[]);
            // Convert objects to arrays for drizzle compatibility
            const rowArrays = rows.map(row => Object.values(row));
            return { rows: rowArrays as unknown[][] };
          }
        } catch (error) {
          console.error("Database error:", error);
          throw error;
        }
      },
      { schema }
    );
  }
  return drizzleDb;
}

/**
 * Get the database file path for debugging
 */
export function getDatabasePath(): string {
  return DB_NAME;
}

/**
 * Run migrations using Vite glob imports
 */
async function initializeMigrations(db: Database) {
  try {
    // 1. Create migrations table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS _drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        created_at INTEGER
      );
    `);

    // 2. Load migration files using Vite's glob import
    // Note: ?raw is needed to get the file content as string
    const migrationFiles = import.meta.glob('./migrations/*.sql', { query: '?raw', eager: true });

    // Sort migrations by filename
    const sortedMigrations = Object.entries(migrationFiles).sort((a, b) => {
      return a[0].localeCompare(b[0]);
    });

    // 3. Get applied migrations
    const appliedMigrations = await db.select<{ hash: string }[]>(
      "SELECT hash FROM _drizzle_migrations ORDER BY created_at ASC"
    ) as unknown as { hash: string }[];

    const appliedHashes = new Set(appliedMigrations.map(m => m.hash));

    // 4. Apply new migrations
    for (const [path, mod] of sortedMigrations) {
      const migrationName = path.split('/').pop() || path;
      const migrationSql = (mod as { default: string }).default;

      // Use filename as a simple hash/identifier for now since we're using filenames as versioning
      // In a more robust setup, we might hash the content, but drizzle-kit uses timestamped filenames
      const migrationId = migrationName;

      if (!appliedHashes.has(migrationId)) {
        console.log(`Applying migration: ${migrationName}`);

        // Split stats by semicolon to execute individually
        // This is a naive split, but sufficient for generated migrations usually
        const statements = migrationSql
          .split('--> statement-breakpoint')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        for (const statement of statements) {
          await db.execute(statement);
        }

        await db.execute(
          "INSERT INTO _drizzle_migrations (hash, created_at) VALUES ($1, $2)",
          [migrationId, Date.now()]
        );
      }
    }

    console.log("Migrations applied successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

/**
 * Get all table names in the database
 */
/**
 * Get all table names in the database
 */
export async function getTableNames(): Promise<string[]> {
  const database = await getDatabase();
  const result = await database.select<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_drizzle_migrations' ORDER BY name"
  );
  return result.map(row => row.name);
}

/**
 * Get all rows from a table
 */
export async function getTableRows(tableName: string): Promise<Record<string, unknown>[]> {
  // Validate table name to prevent SQL injection
  const validTables = await getTableNames();
  if (!validTables.includes(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  const database = await getDatabase();
  return await database.select<Record<string, unknown>[]>(`SELECT * FROM ${tableName}`);
}

/**
 * Get table schema info
 */
export async function getTableInfo(tableName: string): Promise<TableColumn[]> {
  const validTables = await getTableNames();
  if (!validTables.includes(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  const database = await getDatabase();
  const result = await database.select<TableColumn[]>(`PRAGMA table_info(${tableName})`);
  return result;
}

/**
 * Clear all rows from a table (dangerous operation)
 */
export async function clearTable(tableName: string): Promise<void> {
  const validTables = await getTableNames();
  if (!validTables.includes(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  const database = await getDatabase();
  await database.execute(`DELETE FROM ${tableName}`);
}

/**
 * Export all database data as JSON
 */
export async function exportDatabaseAsJson(): Promise<Record<string, Record<string, unknown>[]>> {
  const tables = await getTableNames();
  const data: Record<string, Record<string, unknown>[]> = {};

  for (const table of tables) {
    data[table] = await getTableRows(table);
  }

  return data;
}
