const { test, expect } = require("@playwright/test");
const { connectToDB, getTableNames, getColumnNames } = require("./utils");

// The expected tables and columns in the database
const tables = {
  transactions: ["id", "query", "bindings", "created_at", "updated_at"],
  knex_migrations: ["id", "name", "batch", "migration_time"],
  knex_migrations_lock: ["index", "is_locked"],
};

test.describe("Local transaction db", () => {
  let db;
  test.beforeEach(async () => {
    db = connectToDB("localtransactiondb");
  });
  test("has the expected tables", async () => {
    const tableNames = Object.keys(tables);
    const dbTables = await getTableNames(db);
    expect(dbTables).toEqual(expect.arrayContaining(tableNames));
    // Make sure there are no extra tables
    expect(dbTables).toHaveLength(tableNames.length);
  });
  test("has the expected columns in each table", async () => {
    // Loop over each table and check the columns
    for (const table of Object.keys(tables)) {
      const tableColumns = await getColumnNames(db, table);
      expect(tableColumns).toEqual(expect.arrayContaining(tables[table]));
      // Make sure there are no extra columns
      expect(tableColumns).toHaveLength(tables[table].length);
    }
  });
  test.afterEach(async () => {
    await db.destroy();
  });
});

test.describe("Security measures:", () => {
  let db;
  test("no DB connection with a bad password", async () => {
    // Knex doesn't throw the error when you create the db instance with bad credentials
    // It waits until you try to use the connection
    db = connectToDB("localtransactiondb", "password123");
    // Make sure it throws with the expected error message
    expect(async () => await getTableNames(db)).rejects.toThrow("password authentication failed");
    await db.destroy();
  });
});
