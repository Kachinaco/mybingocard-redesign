import SQLite from "better-sqlite3";
import { EJSON, ObjectId } from "bson";

export type SqliteDocument = Record<string, unknown>;
export type SqliteFilter = Record<string, unknown>;
export type SqliteSort = Record<string, 1 | -1 | "asc" | "desc" | "ascending" | "descending">;

export interface FindManyOptions {
  sort?: SqliteSort;
  skip?: number;
  limit?: number;
}

export interface UpdateOptions {
  upsert?: boolean;
}

export interface FindOneAndUpdateOptions extends UpdateOptions {
  returnDocument?: "before" | "after";
}

export interface InsertOneResult {
  insertedId: unknown;
}

export interface UpdateResult {
  matchedCount: number;
  modifiedCount: number;
  upsertedId?: unknown;
}

export interface DeleteResult {
  deletedCount: number;
}

interface SqliteStatement {
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown;
  run(...params: unknown[]): unknown;
}

interface SqliteConnection {
  prepare(sql: string): SqliteStatement;
  close(): void;
  transaction?: (fn: (...args: any[]) => unknown) => (...args: any[]) => unknown;
}

type SqliteDatabase = SqliteConnection;

interface ShadowRow {
  object_id: string;
  ejson: string;
}

const MISSING = Symbol("missing");

export class SqliteDocumentStore {
  private readonly db: SqliteDatabase;
  private readonly ownsConnection: boolean;
  private readonly selectCollectionRows: SqliteStatement;
  private readonly insertCollection: SqliteStatement;
  private readonly insertDocument: SqliteStatement;
  private readonly updateDocument: SqliteStatement;
  private readonly compareAndSetDocument: SqliteStatement;
  private readonly deleteDocument: SqliteStatement;
  private readonly syncCollectionCount: SqliteStatement;

  constructor(dbOrPath: string | SqliteDatabase, options: { readonly?: boolean } = {}) {
    if (typeof dbOrPath === "string") {
      this.db = new SQLite(dbOrPath, { readonly: options.readonly ?? false });
      this.ownsConnection = true;
    } else {
      this.db = dbOrPath;
      this.ownsConnection = false;
    }

    this.selectCollectionRows = this.db.prepare(
      "SELECT object_id, ejson FROM documents WHERE collection = ? ORDER BY rowid ASC"
    );
    this.insertCollection = this.db.prepare(
      "INSERT INTO collections (name, source_count, exported_count) VALUES (?, 0, 0) ON CONFLICT(name) DO NOTHING"
    );
    this.insertDocument = this.db.prepare(
      "INSERT INTO documents (collection, object_id, ejson) VALUES (?, ?, ?)"
    );
    this.updateDocument = this.db.prepare(
      `INSERT INTO documents (collection, object_id, ejson)
       VALUES (?, ?, ?)
       ON CONFLICT(collection, object_id) DO UPDATE SET ejson = excluded.ejson`
    );
    this.compareAndSetDocument = this.db.prepare(
      `UPDATE documents
       SET ejson = ?
       WHERE collection = ? AND object_id = ? AND ejson = ?`
    );
    this.deleteDocument = this.db.prepare(
      "DELETE FROM documents WHERE collection = ? AND object_id = ?"
    );
    this.syncCollectionCount = this.db.prepare(
      `UPDATE collections
       SET exported_count = (SELECT COUNT(*) FROM documents WHERE collection = ?)
       WHERE name = ?`
    );
  }

  static open(path: string, options: { readonly?: boolean } = {}) {
    return new SqliteDocumentStore(path, options);
  }

  close() {
    if (this.ownsConnection) this.db.close();
  }

  findOne<T extends object = SqliteDocument>(
    collection: string,
    filter: SqliteFilter = {}
  ): T | null {
    return this.findMany<T>(collection, filter, { limit: 1 })[0] ?? null;
  }

  findMany<T extends object = SqliteDocument>(
    collection: string,
    filter: SqliteFilter = {},
    options: FindManyOptions = {}
  ): T[] {
    let docs = this.loadCollection<T>(collection)
      .map((row) => row.document)
      .filter((document) => matchesFilter(document, filter));

    if (options.sort && Object.keys(options.sort).length > 0) {
      docs = [...docs].sort((left, right) => compareDocuments(left, right, options.sort ?? {}));
    }

    const skip = Math.max(0, options.skip ?? 0);
    const limit = options.limit;
    const sliced = skip > 0 ? docs.slice(skip) : docs;
    return typeof limit === "number" ? sliced.slice(0, Math.max(0, limit)) : sliced;
  }

  count(collection: string, filter: SqliteFilter = {}) {
    return this.findMany(collection, filter).length;
  }

  distinct<T = unknown>(collection: string, field: string, filter: SqliteFilter = {}): T[] {
    const seen = new Set<string>();
    const values: T[] = [];

    for (const document of this.findMany(collection, filter)) {
      const value = getByPath(document, field);
      if (value === MISSING || value === null || typeof value === "undefined") continue;
      const entries = Array.isArray(value) ? value : [value];
      for (const entry of entries) {
        const key = canonicalKey(entry);
        if (seen.has(key)) continue;
        seen.add(key);
        values.push(entry as T);
      }
    }

    return values;
  }

  insertOne<T extends object>(collection: string, document: T): InsertOneResult {
    const nextDocument = cloneDocument(document) as SqliteDocument;
    if (!("_id" in nextDocument) || typeof nextDocument["_id"] === "undefined" || nextDocument["_id"] === null) {
      nextDocument["_id"] = new ObjectId();
    }

    const objectId = documentObjectId(nextDocument);
    this.ensureCollection(collection);
    this.insertDocument.run(collection, objectId, encodeDocument(nextDocument));
    this.refreshCollectionCount(collection);

    return { insertedId: nextDocument["_id"] };
  }

  updateOne<T extends object>(
    collection: string,
    filter: SqliteFilter,
    update: SqliteFilter,
    options: UpdateOptions = {}
  ): UpdateResult {
    return this.updateMatching<T>(collection, filter, update, options, 1);
  }

  updateMany<T extends object>(
    collection: string,
    filter: SqliteFilter,
    update: SqliteFilter
  ): UpdateResult {
    return this.updateMatching<T>(collection, filter, update, {}, Number.POSITIVE_INFINITY);
  }

  findOneAndUpdate<T extends object>(
    collection: string,
    filter: SqliteFilter,
    update: SqliteFilter,
    options: FindOneAndUpdateOptions = {}
  ): T | null {
    const row = this.loadCollection<T>(collection).find(({ document }) => matchesFilter(document, filter));

    if (!row) {
      if (!options.upsert) return null;

      const upserted = buildUpsertDocument(filter, update);
      this.ensureCollection(collection);
      this.updateDocument.run(collection, documentObjectId(upserted), encodeDocument(upserted));
      this.refreshCollectionCount(collection);
      return options.returnDocument === "before" ? null : (upserted as T);
    }

    const before = cloneDocument(row.document) as T;
    const after = applyUpdate(row.document, update, false) as T;
    const beforeId = documentObjectId(before);
    const afterId = documentObjectId(after);

    if (beforeId !== afterId) {
      throw new Error("SQLite document updates cannot change _id");
    }

    this.updateDocument.run(collection, afterId, encodeDocument(after));
    return options.returnDocument === "after" ? after : before;
  }

  findOneAndUpdateAtomic<T extends object>(
    collection: string,
    filter: SqliteFilter,
    update: SqliteFilter,
    options: Pick<FindOneAndUpdateOptions, "returnDocument"> = {}
  ): T | null {
    const run = this.transaction(() => {
      const row = this.loadCollection<T>(collection)
        .find(({ document }) => matchesFilter(document, filter));
      if (!row) return null;

      const before = cloneDocument(row.document) as T;
      const after = applyUpdate(row.document, update, false) as T;
      const beforeId = documentObjectId(before);
      const afterId = documentObjectId(after);
      if (beforeId !== afterId) {
        throw new Error("SQLite document updates cannot change _id");
      }

      const result = this.compareAndSetDocument.run(
        encodeDocument(after),
        collection,
        afterId,
        row.ejson
      ) as { changes?: number };
      if (result.changes !== 1) return null;
      return options.returnDocument === "after" ? after : before;
    });

    return run();
  }

  deleteOne(collection: string, filter: SqliteFilter): DeleteResult {
    const row = this.loadCollection(collection).find(({ document }) => matchesFilter(document, filter));
    if (!row) return { deletedCount: 0 };

    this.deleteDocument.run(collection, row.objectId);
    this.refreshCollectionCount(collection);
    return { deletedCount: 1 };
  }

  deleteMany(collection: string, filter: SqliteFilter): DeleteResult {
    const rows = this.loadCollection(collection).filter(({ document }) => matchesFilter(document, filter));
    if (rows.length === 0) return { deletedCount: 0 };

    const deleteRows = this.transaction((matches: Array<{ objectId: string }>) => {
      for (const row of matches) this.deleteDocument.run(collection, row.objectId);
    });
    deleteRows(rows);
    this.refreshCollectionCount(collection);
    return { deletedCount: rows.length };
  }

  private updateMatching<T extends object>(
    collection: string,
    filter: SqliteFilter,
    update: SqliteFilter,
    options: UpdateOptions,
    maxMatches: number
  ): UpdateResult {
    const rows = this.loadCollection<T>(collection).filter(({ document }) => matchesFilter(document, filter));
    const matches = rows.slice(0, maxMatches);

    if (matches.length === 0) {
      if (!options.upsert) return { matchedCount: 0, modifiedCount: 0 };

      const upserted = buildUpsertDocument(filter, update);
      this.ensureCollection(collection);
      this.updateDocument.run(collection, documentObjectId(upserted), encodeDocument(upserted));
      this.refreshCollectionCount(collection);
      return { matchedCount: 0, modifiedCount: 0, upsertedId: upserted._id };
    }

    let modifiedCount = 0;
    const writeMatches = this.transaction((matchedRows: typeof matches) => {
      for (const row of matchedRows) {
        const beforeKey = canonicalKey(row.document);
        const after = applyUpdate(row.document, update, false) as T;
        const beforeId = row.objectId;
        const afterId = documentObjectId(after);

        if (beforeId !== afterId) {
          throw new Error("SQLite document updates cannot change _id");
        }

        if (canonicalKey(after) !== beforeKey) modifiedCount += 1;
        this.updateDocument.run(collection, afterId, encodeDocument(after));
      }
    });
    writeMatches(matches);

    return { matchedCount: matches.length, modifiedCount };
  }

  private loadCollection<T extends object>(collection: string) {
    const rows = this.selectCollectionRows.all(collection) as ShadowRow[];
    return rows.map((row) => ({
      objectId: row.object_id,
      ejson: row.ejson,
      document: decodeDocument<T>(row.ejson),
    }));
  }

  private ensureCollection(collection: string) {
    this.insertCollection.run(collection);
  }

  private refreshCollectionCount(collection: string) {
    this.syncCollectionCount.run(collection, collection);
  }

  private transaction<Args extends unknown[], Result>(fn: (...args: Args) => Result): (...args: Args) => Result {
    if (!this.db.transaction) return fn;
    return this.db.transaction(fn as (...args: any[]) => unknown) as (...args: Args) => Result;
  }
}

export function openMyBingoCardSqliteDocumentStore(path = process.env.MYBINGOCARD_SQLITE_PATH) {
  if (!path) {
    throw new Error("MYBINGOCARD_SQLITE_PATH is required to open the SQLite document store");
  }
  return SqliteDocumentStore.open(path);
}

function decodeDocument<T extends object>(ejson: string): T {
  return EJSON.parse(ejson, { relaxed: true }) as T;
}

function encodeDocument(document: unknown) {
  return EJSON.stringify(document, { relaxed: false });
}

function cloneDocument<T>(document: T): T {
  return EJSON.parse(EJSON.stringify(document, { relaxed: false }), { relaxed: true }) as T;
}

function buildUpsertDocument(filter: SqliteFilter, update: SqliteFilter) {
  const base: SqliteDocument = {};

  for (const [key, value] of Object.entries(filter)) {
    if (key.startsWith("$")) continue;
    if (isOperatorObject(value)) continue;
    setByPath(base, key, cloneDocument(value));
  }

  if (!("_id" in base)) base._id = new ObjectId();
  return applyUpdate(base, update, true);
}

function applyUpdate<T extends object>(document: T, update: SqliteFilter, isInsert: boolean): T {
  const next = cloneDocument(document) as SqliteDocument;
  const entries = Object.entries(update);
  const hasOperators = entries.some(([key]) => key.startsWith("$"));

  if (!hasOperators) {
    const replacement = cloneDocument(update) as SqliteDocument;
    if (!("_id" in replacement)) replacement["_id"] = next["_id"];
    return replacement as T;
  }

  for (const [operator, value] of entries) {
    if (!operator.startsWith("$")) {
      throw new Error(`Cannot mix update operators with replacement fields: ${operator}`);
    }

    const payload = isPlainObject(value) ? (value as Record<string, unknown>) : {};

    if (operator === "$set") {
      for (const [path, pathValue] of Object.entries(payload)) setByPath(next, path, cloneDocument(pathValue));
    } else if (operator === "$setOnInsert") {
      if (isInsert) {
        for (const [path, pathValue] of Object.entries(payload)) setByPath(next, path, cloneDocument(pathValue));
      }
    } else if (operator === "$unset") {
      for (const path of Object.keys(payload)) deleteByPath(next, path);
    } else if (operator === "$inc") {
      for (const [path, amount] of Object.entries(payload)) {
        const current = getByPath(next, path);
        const currentNumber = typeof current === "number" ? current : 0;
        setByPath(next, path, currentNumber + Number(amount ?? 0));
      }
    } else if (operator === "$min") {
      for (const [path, pathValue] of Object.entries(payload)) {
        const current = getByPath(next, path);
        if (current === MISSING || compareScalar(current, pathValue) > 0) {
          setByPath(next, path, cloneDocument(pathValue));
        }
      }
    } else if (operator === "$currentDate") {
      for (const path of Object.keys(payload)) setByPath(next, path, new Date());
    } else if (operator === "$push") {
      for (const [path, pathValue] of Object.entries(payload)) {
        const array = readArrayForMutation(next, path);
        const values = isPlainObject(pathValue) && Array.isArray(pathValue.$each)
          ? pathValue.$each
          : [pathValue];
        array.push(...cloneDocument(values));
        setByPath(next, path, array);
      }
    } else if (operator === "$addToSet") {
      for (const [path, pathValue] of Object.entries(payload)) {
        const array = readArrayForMutation(next, path);
        const values = isPlainObject(pathValue) && Array.isArray(pathValue.$each)
          ? pathValue.$each
          : [pathValue];
        for (const candidate of cloneDocument(values)) {
          if (!array.some((entry) => valueEquals(entry, candidate))) array.push(candidate);
        }
        setByPath(next, path, array);
      }
    } else if (operator === "$pull") {
      for (const [path, pathValue] of Object.entries(payload)) {
        const array = readArrayForMutation(next, path);
        const filtered = array.filter((entry) => {
          if (isOperatorObject(pathValue)) return !matchesFieldValue(entry, pathValue);
          return !valueEquals(entry, pathValue);
        });
        setByPath(next, path, filtered);
      }
    } else {
      throw new Error(`Unsupported SQLite document update operator: ${operator}`);
    }
  }

  return next as T;
}

function matchesFilter(document: unknown, filter: SqliteFilter): boolean {
  for (const [key, condition] of Object.entries(filter)) {
    if (key === "$or") {
      if (!Array.isArray(condition)) return false;
      if (!condition.some((entry) => matchesFilter(document, entry as SqliteFilter))) return false;
      continue;
    }

    if (key === "$and") {
      if (!Array.isArray(condition)) return false;
      if (!condition.every((entry) => matchesFilter(document, entry as SqliteFilter))) return false;
      continue;
    }

    if (key.startsWith("$")) {
      throw new Error(`Unsupported SQLite document filter operator: ${key}`);
    }

    if (!matchesFieldValue(getByPath(document, key), condition)) return false;
  }

  return true;
}

function matchesFieldValue(actual: unknown, condition: unknown): boolean {
  if (!isOperatorObject(condition)) return valueEquals(actual, condition);

  const operators = condition as Record<string, unknown>;
  for (const [operator, operand] of Object.entries(operators)) {
    if (operator === "$eq") {
      if (!valueEquals(actual, operand)) return false;
    } else if (operator === "$ne") {
      if (valueEquals(actual, operand)) return false;
    } else if (operator === "$in") {
      const candidates = Array.isArray(operand) ? operand : [];
      if (!candidates.some((candidate) => valueEquals(actual, candidate))) return false;
    } else if (operator === "$all") {
      const candidates = Array.isArray(operand) ? operand : [];
      if (!Array.isArray(actual)) return false;
      if (!candidates.every((candidate) => actual.some((entry) => valueEquals(entry, candidate)))) return false;
    } else if (operator === "$nin") {
      const candidates = Array.isArray(operand) ? operand : [];
      if (candidates.some((candidate) => valueEquals(actual, candidate))) return false;
    } else if (operator === "$exists") {
      if ((actual !== MISSING) !== Boolean(operand)) return false;
    } else if (operator === "$gt") {
      if (!(compareScalar(actual, operand) > 0)) return false;
    } else if (operator === "$gte") {
      if (!(compareScalar(actual, operand) >= 0)) return false;
    } else if (operator === "$lt") {
      if (!(compareScalar(actual, operand) < 0)) return false;
    } else if (operator === "$lte") {
      if (!(compareScalar(actual, operand) <= 0)) return false;
    } else if (operator === "$regex") {
      const options = typeof operators.$options === "string" ? operators.$options : undefined;
      if (!matchesRegex(actual, operand, options)) return false;
    } else if (operator === "$options") {
      continue;
    } else {
      throw new Error(`Unsupported SQLite document field operator: ${operator}`);
    }
  }

  return true;
}

function compareDocuments(left: unknown, right: unknown, sort: SqliteSort) {
  for (const [field, direction] of Object.entries(sort)) {
    const multiplier = direction === -1 || direction === "desc" || direction === "descending" ? -1 : 1;
    const comparison = compareScalar(getByPath(left, field), getByPath(right, field));
    if (comparison !== 0) return comparison * multiplier;
  }
  return 0;
}

function valueEquals(actual: unknown, expected: unknown): boolean {
  if (actual === MISSING) return false;

  if (Array.isArray(actual) && !Array.isArray(expected)) {
    return actual.some((entry) => valueEquals(entry, expected));
  }

  if (Array.isArray(actual) && Array.isArray(expected)) {
    return actual.length === expected.length && actual.every((entry, index) => valueEquals(entry, expected[index]));
  }

  if (isObjectIdLike(actual) && isObjectIdLike(expected)) {
    return objectIdString(actual) === objectIdString(expected);
  }

  if (actual instanceof Date || expected instanceof Date) {
    return dateTime(actual) === dateTime(expected);
  }

  if (actual === expected) return true;
  if (typeof actual !== typeof expected) return false;

  if (isPlainObject(actual) && isPlainObject(expected)) {
    return canonicalKey(actual) === canonicalKey(expected);
  }

  return false;
}

function compareScalar(left: unknown, right: unknown): number {
  if (left === MISSING && right === MISSING) return 0;
  if (left === MISSING) return -1;
  if (right === MISSING) return 1;

  const leftValue = comparableValue(left);
  const rightValue = comparableValue(right);

  if (leftValue < rightValue) return -1;
  if (leftValue > rightValue) return 1;
  return 0;
}

function comparableValue(value: unknown): number | string | boolean {
  if (value instanceof Date) return value.getTime();
  if (isObjectIdLike(value)) return objectIdString(value);
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
  if (value === null || typeof value === "undefined") return "";
  return canonicalKey(value);
}

function getByPath(document: unknown, path: string): unknown {
  let cursor = document;
  for (const part of path.split(".")) {
    if (cursor === null || typeof cursor !== "object" || !(part in cursor)) return MISSING;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

function setByPath(document: SqliteDocument, path: string, value: unknown) {
  assertSupportedPath(path);
  const parts = path.split(".");
  let cursor: Record<string, unknown> = document;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (!part) throw new Error(`Invalid document path: ${path}`);
    const next = cursor[part];
    if (next === null || typeof next !== "object" || Array.isArray(next)) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }

  const leaf = parts[parts.length - 1];
  if (!leaf) throw new Error(`Invalid document path: ${path}`);
  cursor[leaf] = value;
}

function deleteByPath(document: SqliteDocument, path: string) {
  assertSupportedPath(path);
  const parts = path.split(".");
  let cursor: Record<string, unknown> = document;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (!part) return;
    const next = cursor[part];
    if (next === null || typeof next !== "object" || Array.isArray(next)) return;
    cursor = next as Record<string, unknown>;
  }

  const leaf = parts[parts.length - 1];
  if (leaf) delete cursor[leaf];
}

function readArrayForMutation(document: SqliteDocument, path: string) {
  const current = getByPath(document, path);
  if (current === MISSING || typeof current === "undefined" || current === null) return [];
  if (Array.isArray(current)) return [...current];
  throw new Error(`Expected array at ${path}`);
}

function assertSupportedPath(path: string) {
  if (path.includes(".$.")) {
    throw new Error(`Positional array updates are not supported by the SQLite document store yet: ${path}`);
  }
}

function matchesRegex(actual: unknown, pattern: unknown, options?: string): boolean {
  if (actual === MISSING) return false;
  const regex = pattern instanceof RegExp ? pattern : new RegExp(String(pattern), options);

  if (Array.isArray(actual)) return actual.some((entry): boolean => matchesRegex(entry, regex));
  return regex.test(String(actual));
}

function isOperatorObject(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value) && Object.keys(value).some((key) => key.startsWith("$"));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function documentObjectId(document: object) {
  const record = document as Record<string, unknown>;
  if (!("_id" in record) || typeof record._id === "undefined" || record._id === null) {
    throw new Error("SQLite document is missing _id");
  }
  return objectIdString(record._id);
}

function isObjectIdLike(value: unknown): boolean {
  if (value instanceof ObjectId) return true;
  if (typeof value === "string") return /^[a-fA-F0-9]{24}$/.test(value);
  return typeof value === "object"
    && value !== null
    && "toHexString" in value
    && typeof (value as { toHexString?: unknown }).toHexString === "function";
}

function objectIdString(value: unknown) {
  if (value instanceof ObjectId) return value.toHexString();
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toHexString" in value) {
    const toHexString = (value as { toHexString: () => string }).toHexString;
    return toHexString.call(value);
  }
  return String(value);
}

function dateTime(value: unknown) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" || typeof value === "number") {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? NaN : time;
  }
  return NaN;
}

function canonicalKey(value: unknown) {
  return EJSON.stringify(value, { relaxed: false });
}
