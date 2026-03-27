import { pgTable, serial, text, integer, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";

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

export const userCredits = pgTable("user_credits", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(), // References better-auth users id
  balance: integer("balance").default(2).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const generations = pgTable("generations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // References better-auth users id
  prompt: text("prompt").notNull(),
  referenceImage: text("reference_image"),
  position: positionEnum("position").notNull(),
  style: styleEnum("style").notNull().default("plastic"),
  quality: qualityEnum("quality").notNull(),
  cost: integer("cost").notNull(),
  resultImageUrl: text("result_image_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // References better-auth users id
  creditAmount: integer("credit_amount").notNull(),
  priceIdr: integer("price_idr").notNull(),
  paymentStatus: text("payment_status").notNull(), // 'pending', 'success', 'failed'
  paymentProviderRef: text("payment_provider_ref"),
  createdAt: timestamp("created_at").defaultNow(),
});
