import "dotenv/config";
import { sql } from "drizzle-orm";

async function main() {
  const { db } = await import("../lib/db");
  console.log("Dropping collection_items and collections tables...");
  await db.execute(sql`DROP TABLE IF EXISTS collection_items CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS collections CASCADE;`);
  console.log("Tables dropped successfully.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

