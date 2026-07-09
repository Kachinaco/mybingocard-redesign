const Database = require("better-sqlite3");
const { EJSON, ObjectId } = require("bson");

function openSqliteShadowStore(path = process.env.MYBINGOCARD_SQLITE_PATH) {
  if (!path) {
    throw new Error("MYBINGOCARD_SQLITE_PATH is required");
  }
  return new SqliteShadowStore(path);
}

function openSqliteShadowDatabase(path = process.env.MYBINGOCARD_SQLITE_PATH) {
  return new SqliteShadowDatabase(openSqliteShadowStore(path));
}

class SqliteShadowStore {
  constructor(path) {
    this.db = new Database(path);
    this.collectionCache = new Map();
    this.selectCollectionRows = this.db.prepare(
      "SELECT object_id, ejson FROM documents WHERE collection = ? ORDER BY rowid ASC"
    );
    this.selectCollections = this.db.prepare(
      "SELECT name FROM collections ORDER BY name ASC"
    );
    this.ensureCollection = this.db.prepare(
      `INSERT INTO collections (name, source_count, exported_count)
       VALUES (?, 0, 0)
       ON CONFLICT(name) DO NOTHING`
    );
    this.updateDocument = this.db.prepare(
      `INSERT INTO documents (collection, object_id, ejson)
       VALUES (?, ?, ?)
       ON CONFLICT(collection, object_id) DO UPDATE SET ejson = excluded.ejson`
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

  close() {
    this.db.close();
  }

  findMany(collection) {
    if (!this.collectionCache.has(collection)) {
      this.collectionCache.set(
        collection,
        this.selectCollectionRows.all(collection).map((row) => ({
          objectId: row.object_id,
          document: decodeDocument(row.ejson),
        }))
      );
    }
    return this.collectionCache.get(collection).map((row) => ({
      objectId: row.objectId,
      document: row.document,
    }));
  }

  collectionNames() {
    return this.selectCollections.all().map((row) => row.name);
  }

  replaceOne(collection, document) {
    this.ensureCollection.run(collection);
    const objectId = documentObjectId(document);
    this.updateDocument.run(collection, objectId, encodeDocument(document));
    this.refreshCollectionCount(collection);
    this.collectionCache.delete(collection);
  }

  insertOne(collection, document) {
    const nextDocument = {
      ...document,
      _id: document?._id ?? new ObjectId(),
    };
    this.replaceOne(collection, nextDocument);
    return { insertedId: nextDocument._id };
  }

  deleteOne(collection, document) {
    this.deleteDocument.run(collection, documentObjectId(document));
    this.refreshCollectionCount(collection);
    this.collectionCache.delete(collection);
  }

  refreshCollectionCount(collection) {
    this.syncCollectionCount.run(collection, collection);
  }
}

class SqliteShadowDatabase {
  constructor(store) {
    this.store = store;
  }

  close() {
    this.store.close();
  }

  collection(name) {
    return new SqliteShadowCollection(this.store, name);
  }

  listCollections() {
    return {
      toArray: () => this.store.collectionNames().map((name) => ({ name })),
    };
  }
}

class SqliteShadowCollection {
  constructor(store, name) {
    this.store = store;
    this.name = name;
  }

  documents() {
    return this.store.findMany(this.name).map((row) => row.document);
  }

  countDocuments(filter = {}) {
    return this.documents().filter((document) => matchesFilter(document, filter)).length;
  }

  createIndex() {
    return `${this.name}_sqlite_shadow_index`;
  }

  find(filter = {}, options = {}) {
    const rows = this.documents().filter((document) => matchesFilter(document, filter));
    return new SqliteShadowCursor(rows, options.projection);
  }

  findOne(filter = {}, options = {}) {
    return this.find(filter, options).limit(1).toArray()[0] || null;
  }

  insertOne(document) {
    return this.store.insertOne(this.name, document);
  }

  insertMany(documents = []) {
    const insertedIds = {};
    for (const [index, document] of documents.entries()) {
      const result = this.insertOne(document);
      insertedIds[index] = result.insertedId;
    }
    return {
      acknowledged: true,
      insertedCount: documents.length,
      insertedIds,
    };
  }

  deleteMany(filter = {}) {
    const documents = this.documents().filter((document) => matchesFilter(document, filter));
    for (const document of documents) this.store.deleteOne(this.name, document);
    return { deletedCount: documents.length };
  }

  async updateOne(filter = {}, update = {}, options = {}) {
    const existing = this.find(filter).limit(1).toArray()[0] || null;
    const isInsert = !existing;
    if (!existing && !options.upsert) {
      return { matchedCount: 0, modifiedCount: 0, upsertedId: null };
    }

    const document = existing || filterToDocument(filter);
    applyUpdate(document, update, isInsert);
    const result = existing
      ? this.store.replaceOne(this.name, document)
      : this.store.insertOne(this.name, document);
    return {
      matchedCount: existing ? 1 : 0,
      modifiedCount: 1,
      upsertedId: existing ? null : result.insertedId,
    };
  }

  distinct(field, filter = {}) {
    const seen = new Set();
    const values = [];
    for (const document of this.documents()) {
      if (!matchesFilter(document, filter)) continue;
      const value = getPath(document, field);
      if (value == null) continue;
      const key = distinctKey(value);
      if (seen.has(key)) continue;
      seen.add(key);
      values.push(value);
    }
    return values;
  }

  aggregate(pipeline = []) {
    let rows = this.documents();
    for (const stage of pipeline) {
      if (stage.$match) {
        rows = rows.filter((document) => matchesFilter(document, stage.$match));
      } else if (stage.$group) {
        rows = groupRows(rows, stage.$group);
      } else if (stage.$sort) {
        rows = sortRows(rows, stage.$sort);
      } else if (stage.$limit) {
        rows = rows.slice(0, stage.$limit);
      } else {
        throw new Error(`SQLite shadow aggregate stage is not supported: ${Object.keys(stage).join(", ")}`);
      }
    }
    return new SqliteShadowCursor(rows);
  }
}

class SqliteShadowCursor {
  constructor(rows, projection = null) {
    this.rows = rows.slice();
    this.projection = projection;
  }

  sort(spec = {}) {
    this.rows = sortRows(this.rows, spec);
    return this;
  }

  limit(count) {
    this.rows = this.rows.slice(0, count);
    return this;
  }

  project(projection = {}) {
    this.projection = projection;
    return this;
  }

  toArray() {
    return this.rows.map((document) => projectDocument(document, this.projection));
  }
}

function decodeDocument(ejson) {
  return EJSON.parse(ejson, { relaxed: true });
}

function encodeDocument(document) {
  return EJSON.stringify(document, { relaxed: false });
}

function documentObjectId(document) {
  if (!document || typeof document !== "object" || document._id == null) {
    throw new Error("SQLite document is missing _id");
  }
  return objectIdString(document._id);
}

function objectIdString(value) {
  if (value instanceof ObjectId) return value.toHexString();
  if (value && typeof value === "object" && typeof value.toHexString === "function") {
    return value.toHexString();
  }
  if (value && typeof value === "object" && typeof value.$oid === "string") {
    return value.$oid;
  }
  return String(value);
}

function matchesFilter(document, filter = {}) {
  return Object.entries(filter || {}).every(([key, condition]) => {
    if (key === "$or") return condition.some((part) => matchesFilter(document, part));
    if (key === "$and") return condition.every((part) => matchesFilter(document, part));
    return matchesCondition(getPath(document, key), condition);
  });
}

function matchesCondition(value, condition) {
  if (condition instanceof RegExp) return condition.test(String(value || ""));
  if (condition && typeof condition === "object" && !(condition instanceof Date) && !(condition instanceof ObjectId)) {
    const operatorKeys = Object.keys(condition).filter((key) => key.startsWith("$"));
    if (operatorKeys.length > 0) {
      return operatorKeys.every((operator) => {
        const expected = condition[operator];
        if (operator === "$gte") return compareValues(value, expected) >= 0;
        if (operator === "$gt") return compareValues(value, expected) > 0;
        if (operator === "$lte") return compareValues(value, expected) <= 0;
        if (operator === "$lt") return compareValues(value, expected) < 0;
        if (operator === "$ne") return !valuesEqual(value, expected);
        if (operator === "$in") return expected.some((entry) => valuesEqual(value, entry));
        if (operator === "$nin") return !expected.some((entry) => valuesEqual(value, entry));
        if (operator === "$exists") return expected ? value !== undefined : value === undefined;
        if (operator === "$regex") {
          const regex = expected instanceof RegExp
            ? expected
            : new RegExp(String(expected), condition.$options || "");
          return regex.test(String(value || ""));
        }
        if (operator === "$options") return true;
        throw new Error(`SQLite shadow filter operator is not supported: ${operator}`);
      });
    }
  }
  return valuesEqual(value, condition);
}

function valuesEqual(left, right) {
  if (left instanceof Date || right instanceof Date) {
    const leftTime = dateTime(left);
    const rightTime = dateTime(right);
    return leftTime != null && rightTime != null && leftTime === rightTime;
  }
  if (isObjectIdLike(left) || isObjectIdLike(right)) {
    return objectIdString(left) === objectIdString(right);
  }
  return left === right;
}

function compareValues(left, right) {
  const leftTime = dateTime(left);
  const rightTime = dateTime(right);
  if (leftTime != null && rightTime != null) return leftTime - rightTime;
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function dateTime(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function isObjectIdLike(value) {
  return value instanceof ObjectId
    || (value && typeof value === "object" && typeof value.toHexString === "function")
    || (value && typeof value === "object" && typeof value.$oid === "string");
}

function getPath(document, path) {
  return String(path).split(".").reduce((value, segment) => {
    if (value == null) return undefined;
    return value[segment];
  }, document);
}

function setPath(document, path, value) {
  const parts = String(path).split(".");
  let cursor = document;
  for (const part of parts.slice(0, -1)) {
    cursor[part] = cursor[part] || {};
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function unsetPath(document, path) {
  const parts = String(path).split(".");
  let cursor = document;
  for (const part of parts.slice(0, -1)) {
    if (!cursor || typeof cursor !== "object") return;
    cursor = cursor[part];
  }
  if (cursor && typeof cursor === "object") delete cursor[parts[parts.length - 1]];
}

function projectDocument(document, projection) {
  if (!projection) return document;
  const included = Object.entries(projection).filter(([, value]) => value);
  if (included.length === 0) return document;
  const projected = {};
  if (projection._id !== 0 && document._id !== undefined) projected._id = document._id;
  for (const [field] of included) {
    if (field === "_id") continue;
    const value = getPath(document, field);
    if (value !== undefined) setPath(projected, field, value);
  }
  return projected;
}

function filterToDocument(filter = {}) {
  const document = {};
  for (const [field, value] of Object.entries(filter)) {
    if (field.startsWith("$")) continue;
    if (value && typeof value === "object" && !(value instanceof Date) && !(value instanceof ObjectId)) {
      const operatorKeys = Object.keys(value).filter((key) => key.startsWith("$"));
      if (operatorKeys.length > 0) continue;
    }
    setPath(document, field, value);
  }
  return document;
}

function applyUpdate(document, update = {}, isInsert = false) {
  if (!Object.keys(update).some((key) => key.startsWith("$"))) {
    for (const [field, value] of Object.entries(update)) setPath(document, field, value);
    return;
  }
  if (update.$set) {
    for (const [field, value] of Object.entries(update.$set)) setPath(document, field, value);
  }
  if (isInsert && update.$setOnInsert) {
    for (const [field, value] of Object.entries(update.$setOnInsert)) setPath(document, field, value);
  }
  if (update.$unset) {
    for (const field of Object.keys(update.$unset)) unsetPath(document, field);
  }
  if (update.$inc) {
    for (const [field, value] of Object.entries(update.$inc)) {
      const current = Number(getPath(document, field) || 0);
      setPath(document, field, current + Number(value));
    }
  }
  if (update.$currentDate) {
    for (const field of Object.keys(update.$currentDate)) setPath(document, field, new Date());
  }
}

function sortRows(rows, spec = {}) {
  const entries = Object.entries(spec);
  return rows.slice().sort((a, b) => {
    for (const [field, direction] of entries) {
      const result = compareValues(getPath(a, field), getPath(b, field));
      if (result !== 0) return direction < 0 ? -result : result;
    }
    return 0;
  });
}

function groupRows(rows, groupSpec) {
  const groups = new Map();
  const idSpec = groupSpec._id;
  for (const row of rows) {
    const id = typeof idSpec === "string" && idSpec.startsWith("$")
      ? getPath(row, idSpec.slice(1))
      : idSpec;
    const key = distinctKey(id);
    if (!groups.has(key)) groups.set(key, { _id: id });
    const group = groups.get(key);
    for (const [field, accumulator] of Object.entries(groupSpec)) {
      if (field === "_id") continue;
      if (accumulator && accumulator.$sum != null) {
        group[field] = (group[field] || 0) + Number(accumulatorValue(row, accumulator.$sum));
      } else if (accumulator && accumulator.$max != null) {
        const value = accumulatorValue(row, accumulator.$max);
        if (group[field] === undefined || compareValues(value, group[field]) > 0) group[field] = value;
      } else {
        throw new Error(`SQLite shadow group accumulator is not supported for ${field}`);
      }
    }
  }
  return [...groups.values()];
}

function accumulatorValue(row, expression) {
  if (typeof expression === "string" && expression.startsWith("$")) {
    return getPath(row, expression.slice(1));
  }
  return expression;
}

function distinctKey(value) {
  if (isObjectIdLike(value)) return `oid:${objectIdString(value)}`;
  if (value instanceof Date) return `date:${value.toISOString()}`;
  return `${typeof value}:${String(value)}`;
}

module.exports = {
  openSqliteShadowDatabase,
  openSqliteShadowStore,
};
