const knex = require("knex");
const { pushkinConfig } = require("./siteInfo");

/**
 * Connect to a Pushkin database
 * @param {string} dbType Either "localtestdb" or "localtransactiondb"
 * @param {string} password Defaults to the password in the Pushkin config; can be overridden for test purposes
 * @returns {knex} A connection to the Pushkin database
 */
function connectToDB(dbType, password) {
  const connection = {};
  if (dbType === "localtestdb" || dbType === "localtransactiondb") {
    Object.assign(connection, {
      host: pushkinConfig.databases[dbType].url,
      database: pushkinConfig.databases[dbType].name,
      port: pushkinConfig.databases[dbType].port,
      user: pushkinConfig.databases[dbType].user,
      password: password || pushkinConfig.databases[dbType].pass,
    });
  } else {
    throw new Error(`Invalid database type: ${dbType}`);
  }
  try {
    const instance = knex({
      client: "pg",
      connection: connection,
    });
    return instance;
  } catch (error) {
    console.error(`Could not connect to ${dbType}`, error);
    throw error;
  }
}

/**
 * Get the table names from a database
 * @param {knex} db A connection to a Pushkin database
 * @returns {string[]} The table names in the database
 */
function getTableNames(db) {
  return db("information_schema.tables")
    .select("table_name")
    .where("table_schema", "public")
    .then((tables) => tables.map((row) => row.table_name));
}

/**
 * Get the column names from a db table
 * @param {knex} db A connection to a Pushkin database
 * @param {string} table The name of the table
 * @returns {string[]} The column names in the table
 */
function getColumnNames(db, table) {
  return db("information_schema.columns")
    .select("column_name")
    .where("table_name", table)
    .then((columns) => columns.map((row) => row.column_name));
}

module.exports = {
  connectToDB,
  getTableNames,
  getColumnNames,
};
