import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sqlUrl = process.env.DATABASE_URL || "postgres://dummy:dummy@dummy/dummy";
const sql = neon(sqlUrl);
export const db = drizzle({ client: sql, schema });
