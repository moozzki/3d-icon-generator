import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
import { sql } from "drizzle-orm";

const OLD_HOST = "https://cdn.useaudora.com/";
const NEW_HOST = "https://cdn.zupericon.com/";

const COLUMNS = [
  { table: "generations", column: "reference_image" },
  { table: "generations", column: "base_image_url" },
  { table: "generations", column: "result_image_url" },
  { table: "generations", column: "transparent_image_url" },
  { table: "animations", column: "base_image_url" },
  { table: "animations", column: "result_video_url" },
];

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  const { db } = await import("../lib/db");
  const like = `%${OLD_HOST}%`;

  console.log(
    `${isDryRun ? "[DRY RUN] " : ""}Migrating CDN URLs: ${OLD_HOST} -> ${NEW_HOST}`
  );

  let totalAffected = 0;

  for (const { table, column } of COLUMNS) {
    if (isDryRun) {
      const count = await db.execute(sql`
        SELECT COUNT(*) AS count FROM ${sql.identifier(table)}
        WHERE ${sql.identifier(column)} LIKE ${like}
      `);
      const n = Number(count.rows[0]?.count ?? 0);
      totalAffected += n;
      console.log(`  ${table}.${column}: ${n} row(s) with old CDN`);
    } else {
      const result = await db.execute(sql`
        UPDATE ${sql.identifier(table)}
        SET ${sql.identifier(column)} = REPLACE(${sql.identifier(column)}, ${OLD_HOST}, ${NEW_HOST})
        WHERE ${sql.identifier(column)} LIKE ${like}
      `);
      console.log(`  ${table}.${column}: ${result.rowCount ?? "?"} row(s) updated`);
    }
  }

  if (isDryRun) {
    console.log(`Total: ${totalAffected} row(s) would be updated. No changes made.`);
    process.exit(0);
  }

  const remaining = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM generations
        WHERE reference_image LIKE ${like}
           OR base_image_url LIKE ${like}
           OR result_image_url LIKE ${like}
           OR transparent_image_url LIKE ${like})
      + (SELECT COUNT(*) FROM animations
        WHERE base_image_url LIKE ${like}
           OR result_video_url LIKE ${like}) AS remaining
  `);

  console.log("Remaining old-CDN references:", remaining.rows[0]?.remaining ?? "unknown");
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
