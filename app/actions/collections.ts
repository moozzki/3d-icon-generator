"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { collections, collectionItems, generations } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, desc, inArray } from "drizzle-orm";

const createCollectionSchema = z.object({
  name: z.string().min(1, "Collection name cannot be empty").max(255),
});

const renameCollectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Collection name cannot be empty").max(255),
});

async function getUniqueCollectionName(userId: string, targetName: string, excludeId?: string): Promise<string> {
  const existingCollections = await db
    .select({ id: collections.id, name: collections.name })
    .from(collections)
    .where(eq(collections.userId, userId));

  const existingNames = new Set(
    existingCollections
      .filter((col) => !excludeId || col.id !== excludeId)
      .map((col) => col.name.trim().toLowerCase())
  );

  const trimmed = targetName.trim();
  if (!existingNames.has(trimmed.toLowerCase())) {
    return trimmed;
  }

  // Check if targetName already ends with " (N)"
  const match = trimmed.match(/^(.*?)\s+\((\d+)\)$/);
  let baseName = trimmed;
  let counter = 1;

  if (match) {
    baseName = match[1];
    counter = parseInt(match[2], 10);
  }

  let candidate = `${baseName} (${counter})`;
  while (existingNames.has(candidate.toLowerCase())) {
    counter++;
    candidate = `${baseName} (${counter})`;
  }

  return candidate;
}

export async function createCollection(name: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const validated = createCollectionSchema.parse({ name: name.trim() });
  const uniqueName = await getUniqueCollectionName(session.user.id, validated.name);

  const [newCollection] = await db
    .insert(collections)
    .values({
      userId: session.user.id,
      name: uniqueName,
    })
    .returning();

  return { success: true, collection: newCollection };
}

export async function renameCollection(id: string, name: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const validated = renameCollectionSchema.parse({ id, name: name.trim() });

  // Verify ownership
  const existing = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, validated.id), eq(collections.userId, session.user.id)))
    .limit(1);

  if (existing.length === 0) {
    throw new Error("Collection not found or access denied");
  }

  const uniqueName = await getUniqueCollectionName(session.user.id, validated.name, validated.id);

  const [updatedCollection] = await db
    .update(collections)
    .set({
      name: uniqueName,
      updatedAt: new Date(),
    })
    .where(and(eq(collections.id, validated.id), eq(collections.userId, session.user.id)))
    .returning();

  return { success: true, collection: updatedCollection };
}

export async function deleteCollection(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, session.user.id)))
    .limit(1);

  if (existing.length === 0) {
    throw new Error("Collection not found or access denied");
  }

  // Deleting the collection will cascade delete collectionItems due to DB FK constraint
  await db
    .delete(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, session.user.id)));

  return { success: true };
}

export async function addItemToCollection(collectionId: string, generationId: number) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Verify collection ownership
  const collection = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, session.user.id)))
    .limit(1);

  if (collection.length === 0) {
    throw new Error("Collection not found or access denied");
  }

  // Check if item is already in collection
  const existingItem = await db
    .select()
    .from(collectionItems)
    .where(
      and(
        eq(collectionItems.collectionId, collectionId),
        eq(collectionItems.generationId, generationId)
      )
    )
    .limit(1);

  if (existingItem.length > 0) {
    return { success: true, message: "Item already in collection" };
  }

  await db.insert(collectionItems).values({
    collectionId,
    generationId,
  });

  return { success: true };
}

export async function removeItemFromCollection(collectionId: string, generationId: number) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Verify collection ownership
  const collection = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, session.user.id)))
    .limit(1);

  if (collection.length === 0) {
    throw new Error("Collection not found or access denied");
  }

  await db
    .delete(collectionItems)
    .where(
      and(
        eq(collectionItems.collectionId, collectionId),
        eq(collectionItems.generationId, generationId)
      )
    );

  return { success: true };
}

export async function getUserCollections() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return [];
  }

  const userCollections = await db
    .select()
    .from(collections)
    .where(eq(collections.userId, session.user.id))
    .orderBy(desc(collections.createdAt));

  return userCollections;
}

export async function getCollectionWithItems(collectionId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Get collection details
  const [collection] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, session.user.id)))
    .limit(1);

  if (!collection) {
    throw new Error("Collection not found or access denied");
  }

  // Get items in collection
  const items = await db
    .select({
      id: collectionItems.id,
      collectionId: collectionItems.collectionId,
      generationId: collectionItems.generationId,
      createdAt: collectionItems.createdAt,
      generation: generations,
    })
    .from(collectionItems)
    .innerJoin(generations, eq(collectionItems.generationId, generations.id))
    .where(eq(collectionItems.collectionId, collectionId))
    .orderBy(desc(collectionItems.createdAt));

  return {
    collection,
    items,
  };
}

export async function getGenerationCollectionIds(generationId: number) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return [];
  }

  const items = await db
    .select({ collectionId: collectionItems.collectionId })
    .from(collectionItems)
    .innerJoin(collections, eq(collectionItems.collectionId, collections.id))
    .where(
      and(
        eq(collectionItems.generationId, generationId),
        eq(collections.userId, session.user.id)
      )
    );

  return items.map((item) => item.collectionId);
}
