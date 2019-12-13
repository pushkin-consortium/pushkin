exports.up = function(knex) {
  return knex.schema.createTable('pushkintemplate_users', table => {
	table.string('user_id').primary();
	table.string('experiment').defaultTo('pushkintemplate');
    table.timestamp('created_at').notNullable();
    table.timestamp('updated_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('pushkintemplate_users');
};
