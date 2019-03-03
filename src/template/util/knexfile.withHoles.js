module.exports = {
	development: {
		client: 'postgresql',
		connection: 'postgres://${db_user}:${db_pass}@localhost/${db_name}',
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
