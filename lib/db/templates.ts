import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";

export interface Template {
  _id: ObjectId;
  title: string;
  description?: string;
  category: string; // e.g., "baby-shower", "classroom", "holiday", "team-building"
  tags: string[]; // For search/filtering
  size: 3 | 4 | 5;
  cells: string[]; // Pre-filled cell values
  freeSpace: boolean;
  style: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    fontSize?: string;
    fontFamily?: string;
  };
  isPremium: boolean; // Requires paid plan
  isFeatured: boolean; // Show on homepage
  thumbnail?: string; // Preview image URL
  uses: number; // How many times used
  createdAt: Date;
  updatedAt: Date;
}

export async function createTemplate(data: Omit<Template, "_id" | "createdAt" | "updatedAt" | "uses">): Promise<Template> {
  const template: Partial<Template> = {
    ...data,
    uses: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (useSqliteDb()) {
    const result = getSqliteStore().insertOne("templates", template as Template);
    return {
      ...template,
      _id: result.insertedId as ObjectId,
    } as Template;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  const result = await db.collection<Template>("templates").insertOne(template as Template);

  return {
    ...template,
    _id: result.insertedId,
  } as Template;
}

export async function getAllTemplates(filters?: {
  category?: string;
  isPremium?: boolean;
  isFeatured?: boolean;
}): Promise<Template[]> {
  if (useSqliteDb()) {
    const query: Record<string, unknown> = {};
    if (filters?.category) query.category = filters.category;
    if (filters?.isPremium !== undefined) query.isPremium = filters.isPremium;
    if (filters?.isFeatured !== undefined) query.isFeatured = filters.isFeatured;

    return getSqliteStore().findMany<Template>("templates", query, {
      sort: { isFeatured: -1, uses: -1 },
    });
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  const query: any = {};
  if (filters?.category) query.category = filters.category;
  if (filters?.isPremium !== undefined) query.isPremium = filters.isPremium;
  if (filters?.isFeatured !== undefined) query.isFeatured = filters.isFeatured;

  const templates = await db
    .collection<Template>("templates")
    .find(query)
    .sort({ isFeatured: -1, uses: -1 })
    .toArray();

  return templates;
}

export async function getTemplateById(templateId: string): Promise<Template | null> {
  if (useSqliteDb()) {
    return getSqliteStore().findOne<Template>("templates", { _id: new ObjectId(templateId) });
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  const template = await db.collection<Template>("templates").findOne({
    _id: new ObjectId(templateId),
  });

  return template;
}

export async function searchTemplates(searchTerm: string): Promise<Template[]> {
  if (useSqliteDb()) {
    return getSqliteStore().findMany<Template>(
      "templates",
      {
        $or: [
          { title: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
          { tags: { $regex: searchTerm, $options: "i" } },
        ],
      },
      { sort: { uses: -1 } }
    );
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  const templates = await db
    .collection<Template>("templates")
    .find({
      $or: [
        { title: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
        { tags: { $regex: searchTerm, $options: "i" } },
      ],
    })
    .sort({ uses: -1 })
    .toArray();

  return templates;
}

export async function incrementTemplateUses(templateId: string): Promise<void> {
  if (useSqliteDb()) {
    getSqliteStore().updateOne<Template>(
      "templates",
      { _id: new ObjectId(templateId) },
      { $inc: { uses: 1 } }
    );
    return;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  await db.collection<Template>("templates").updateOne(
    { _id: new ObjectId(templateId) },
    { $inc: { uses: 1 } }
  );
}

export async function updateTemplate(
  templateId: string,
  data: Partial<Template>
): Promise<Template | null> {
  if (useSqliteDb()) {
    return getSqliteStore().findOneAndUpdate<Template>(
      "templates",
      { _id: new ObjectId(templateId) },
      {
        $set: {
          ...data,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  const result = await db.collection<Template>("templates").findOneAndUpdate(
    { _id: new ObjectId(templateId) },
    {
      $set: {
        ...data,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

export async function deleteTemplate(templateId: string): Promise<boolean> {
  if (useSqliteDb()) {
    return getSqliteStore().deleteOne("templates", { _id: new ObjectId(templateId) }).deletedCount > 0;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  const result = await db.collection<Template>("templates").deleteOne({
    _id: new ObjectId(templateId),
  });

  return result.deletedCount > 0;
}

// Get popular templates (most used)
export async function getPopularTemplates(limit: number = 10): Promise<Template[]> {
  if (useSqliteDb()) {
    return getSqliteStore().findMany<Template>("templates", {}, {
      sort: { uses: -1 },
      limit,
    });
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  const templates = await db
    .collection<Template>("templates")
    .find({})
    .sort({ uses: -1 })
    .limit(limit)
    .toArray();

  return templates;
}

// Get templates by category
export async function getTemplatesByCategory(category: string): Promise<Template[]> {
  if (useSqliteDb()) {
    return getSqliteStore().findMany<Template>("templates", { category }, { sort: { uses: -1 } });
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  const templates = await db
    .collection<Template>("templates")
    .find({ category })
    .sort({ uses: -1 })
    .toArray();

  return templates;
}
