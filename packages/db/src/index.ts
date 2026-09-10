export interface DatabaseContext {
  db: D1Database;
}

export function createDatabaseContext(db: D1Database): DatabaseContext {
  return { db };
}
