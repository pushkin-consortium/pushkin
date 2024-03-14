exports.up = function(knex) {
  return knex.schema.createTable('pushkin_users', table => {
	table.string('user_id').primary();
    table.timestamp('created_at').notNullable();
    table.timestamp('updated_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('pushkin_users');
};
