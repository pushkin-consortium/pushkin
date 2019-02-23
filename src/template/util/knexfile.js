module.exports = {
  development: {
    client: 'postgresql',
    connection: 'postgres://postgres:@localhost/test_db',
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
			tableName: 'knex_migrations',
			directory: __dirname + '/db_migrations'
		},
		seeds: {
			directory: __dirname + '/db_seeds'
		}
  }
};
