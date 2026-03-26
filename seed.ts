import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { db } = await import("./lib/db");
  const { user, userCredits } = await import("./lib/db/schema");
  const { auth } = await import("./lib/auth");
  const { eq } = await import("drizzle-orm");

  console.log("Seeding admin...");
  
  try {
    // 1. Create user via API
    const result = await auth.api.signUpEmail({
      body: {
        email: "admin@example.com",
        password: "password123",
        name: "Admin User",
      },
      headers: new Headers(),
    });

    if (result?.user?.id) {
      // 2. Set role to admin via DB
      await db.update(user).set({ role: "admin" }).where(eq(user.id, result.user.id));
      
      // 3. Set credits to "unlimited" (e.g. 999999)
      const existingCredits = await db.select().from(userCredits).where(eq(userCredits.userId, result.user.id));
      if (existingCredits.length === 0) {
        await db.insert(userCredits).values({
            userId: result.user.id,
            balance: 999999
        });
      } else {
        await db.update(userCredits).set({ balance: 999999 }).where(eq(userCredits.userId, result.user.id));
      }
      
      console.log("Admin seeded successfully. Email: admin@example.com | Password: password123");
    } else {
      console.error("Sign up response didn't contain user ID", result);
    }
  } catch (err: unknown) {
    const error = err as { message?: string; body?: { message?: string }; name?: string };
    if (error?.message === "User already exists" || error?.body?.message === "User already exists" || error?.name === "APIError") {
        console.log("Admin user might already exist. Attempting to update role...");
        const existingUser = await db.select().from(user).where(eq(user.email, "admin@example.com")).limit(1);
        if (existingUser[0]) {
          await db.update(user).set({ role: "admin" }).where(eq(user.id, existingUser[0].id));
          
          const existingCredits = await db.select().from(userCredits).where(eq(userCredits.userId, existingUser[0].id));
          if (existingCredits.length === 0) {
            await db.insert(userCredits).values({
                userId: existingUser[0].id,
                balance: 999999
            });
          } else {
            await db.update(userCredits).set({ balance: 999999 }).where(eq(userCredits.userId, existingUser[0].id));
          }
          console.log("Admin user role and credits updated.");
        }
    } else {
        console.error("Failed to seed.", error);
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
