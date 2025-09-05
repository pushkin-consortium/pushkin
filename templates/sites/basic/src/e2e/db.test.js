const { test, expect } = require("@playwright/test");
const { connectToDB, getTableNames, getColumnNames } = require("./utils");

// The expected tables and columns in the database (minus experiment tables)
const tables = {
  pushkin_users: ["user_id", "created_at", "updated_at"],
  pushkin_userResults: [
    "id",
    "user_id",
    "experiment",
    "summary_stat",
    "results",
    "created_at",
    "updated_at",
  ],
  pushkin_userMeta: ["id", "user_id", "metaQuestion", "metaResponse", "created_at", "updated_at"],
  knex_migrations: ["id", "name", "batch", "migration_time"],
  knex_migrations_lock: ["index", "is_locked"],
};

const expTableColumns = ["id", "user_id", "stimulus", "response", "created_at", "updated_at"];

test.describe("Local test db", () => {
  let db;
  test.beforeEach(async () => {
    db = connectToDB("localtestdb");
  });
  test("has the minimum expected tables", async () => {
    const dbTables = await getTableNames(db);
    // expTable will match the name of any experiment table
    const expTable = expect.stringMatching(/^[a-z_]+_stimulusResponses$/);
    // Get the names of the experiment tables
    const expTables = dbTables.filter((table) => table.match(/^[a-z_]+_stimulusResponses$/));
    expect(dbTables).toEqual(expect.arrayContaining(Object.keys(tables).concat(expTable)));
    // Make sure there are no extra tables
    expect(dbTables).toHaveLength(Object.keys(tables).length + expTables.length);
  });
  test("has the expected columns in each non-experiment table", async () => {
    // Loop over each table and check the columns
    for (const table of Object.keys(tables)) {
      const tableColumns = await getColumnNames(db, table);
      expect(tableColumns).toEqual(expect.arrayContaining(tables[table]));
      // Make sure there are no extra columns
      expect(tableColumns).toHaveLength(tables[table].length);
    }
  });
  test("has the expected columns in each experiment table", async () => {
    const dbTables = await getTableNames(db);
    const expTables = dbTables.filter((table) => table.match(/^[a-z_]+_stimulusResponses$/));
    // Loop over each table and check the columns
    for (const table of expTables) {
      const tableColumns = await getColumnNames(db, table);
      expect(tableColumns).toEqual(expect.arrayContaining(expTableColumns));
      // Make sure there are no extra columns
      expect(tableColumns).toHaveLength(expTableColumns.length);
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
    db = connectToDB("localtestdb", "password123");
    // Make sure it throws with the expected error message
    expect(async () => await getTableNames(db)).rejects.toThrow("password authentication failed");
    await db.destroy();
  });
});
