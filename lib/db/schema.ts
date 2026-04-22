import { pgTable, serial, text, integer, timestamp, pgEnum, boolean, numeric } from "drizzle-orm/pg-core";

export const positionEnum = pgEnum("position", [
  "isometric", "front_facing", "back_facing", "side_facing",
  "three_quarter", "top_down", "dimetric"
]);

export const styleEnum = pgEnum("style", [
  "plastic", "clay", "glass", "plush", "toy_block", "metallic"
]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  role: text("role").default("user"),
  banned: boolean("banned"),
  banReason: text("banReason"),
  banExpires: timestamp("banExpires"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id),
  impersonatedBy: text("impersonatedBy"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

export const qualityEnum = pgEnum("quality", ["2K", "4K"]);

export const statusEnum = pgEnum("status", ["pending", "completed", "failed"]);

export const aiModelEnum = pgEnum("ai_model", ["flux-2-pro", "nano-banana-2"]);


export const userCredits = pgTable("user_credits", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(), // References better-auth users id
  balance: integer("balance").default(2).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const generations = pgTable("generations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // References better-auth users id
  jobId: text("job_id"),
  status: statusEnum("status").default("pending"),
  aiModel: aiModelEnum("ai_model").notNull().default("flux-2-pro"),
  prompt: text("prompt").notNull(),
  userPrompt: text("user_prompt"),   // Raw user input — displayed on frontend
  referenceImage: text("reference_image"),
  position: positionEnum("position").notNull(),
  style: styleEnum("style").notNull().default("plastic"),
  quality: qualityEnum("quality").notNull(),
  color: text("color"),   // Optional HEX color chosen by user e.g. "#FF5733". null = no color override
  cost: integer("cost").notNull(),
  creditCost: integer("credit_cost").notNull().default(1),
  creditRefunded: boolean("credit_refunded").default(false), // true once credits returned
  failReason: text("fail_reason"),    // Human-readable error reason for failed jobs
  baseImageUrl: text("base_image_url"),
  resultImageUrl: text("result_image_url"),
  transparentImageUrl: text("transparent_image_url"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // References better-auth users id
  creditAmount: integer("credit_amount").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(), // Supports IDR integers & USD decimals
  currency: text("currency").notNull().default("IDR"),              // 'IDR' | 'USD'
  paymentProvider: text("payment_provider").notNull(),               // 'pakasir' | 'polar'
  paymentStatus: text("payment_status").notNull(), // 'pending' | 'paid' | 'cancelled' | 'expired'
  paymentProviderRef: text("payment_provider_ref"),
  expiresAt: timestamp("expires_at"),              // 1 hour after creation for IDR/Pakasir
  createdAt: timestamp("created_at").defaultNow(),
});

export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  status: text("status").default("waitlisted"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const feedbacks = pgTable("feedbacks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  rating: integer("rating").notNull(),
  content: text("content").notNull(),
  suggestions: text("suggestions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Feedback = typeof feedbacks.$inferSelect;
export type NewFeedback = typeof feedbacks.$inferInsert;
