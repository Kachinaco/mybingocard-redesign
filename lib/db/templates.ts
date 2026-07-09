import { ObjectId } from "bson";
import { getSqliteStore } from "@/lib/db/sqlite";

export interface Template {
  _id: ObjectId;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  size: 3 | 4 | 5;
  cells: string[];
  freeSpace: boolean;
  style: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    fontSize?: string;
    fontFamily?: string;
  };
  isPremium: boolean;
  isFeatured: boolean;
  thumbnail?: string;
  uses: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function createTemplate(
  data: Omit<Template, "_id" | "createdAt" | "updatedAt" | "uses">
): Promise<Template> {
  const template: Partial<Template> = {
    ...data,
    uses: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const result = getSqliteStore().insertOne("templates", template as Template);

  return {
    ...template,
    _id: result.insertedId as ObjectId,
  } as Template;
}

export async function getAllTemplates(filters?: {
  category?: string;
  isPremium?: boolean;
  isFeatured?: boolean;
}): Promise<Template[]> {
  const query: Record<string, unknown> = {};
  if (filters?.category) query.category = filters.category;
  if (filters?.isPremium !== undefined) query.isPremium = filters.isPremium;
  if (filters?.isFeatured !== undefined) query.isFeatured = filters.isFeatured;

  return getSqliteStore().findMany<Template>("templates", query, {
    sort: { isFeatured: -1, uses: -1 },
  });
}

export async function getTemplateById(templateId: string): Promise<Template | null> {
  return getSqliteStore().findOne<Template>("templates", { _id: new ObjectId(templateId) });
}

export async function searchTemplates(searchTerm: string): Promise<Template[]> {
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

export async function incrementTemplateUses(templateId: string): Promise<void> {
  getSqliteStore().updateOne<Template>(
    "templates",
    { _id: new ObjectId(templateId) },
    { $inc: { uses: 1 } }
  );
}

export async function updateTemplate(
  templateId: string,
  data: Partial<Template>
): Promise<Template | null> {
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

export async function deleteTemplate(templateId: string): Promise<boolean> {
  return getSqliteStore().deleteOne("templates", { _id: new ObjectId(templateId) }).deletedCount > 0;
}

export async function getPopularTemplates(limit: number = 10): Promise<Template[]> {
  return getSqliteStore().findMany<Template>("templates", {}, {
    sort: { uses: -1 },
    limit,
  });
}

export async function getTemplatesByCategory(category: string): Promise<Template[]> {
  return getSqliteStore().findMany<Template>("templates", { category }, { sort: { uses: -1 } });
}
