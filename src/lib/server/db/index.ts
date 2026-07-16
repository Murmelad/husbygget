import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

/** A Drizzle client bound to a request-scoped D1 database. */
export const getDb = (d1: D1Database) => drizzle(d1, { schema });

export { schema };
export * from './schema';
