const seeder = require('knex-csv-seeder').default;

exports.seed = seeder({
  table: 'users',
	file: '/path/to/users.csv'
}

