exports.up = function(knex) {
  return knex.schema.createTable('miniexample_metaResponses', table => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('miniexample_users');
    table.json('data_string');
    table.timestamp('created_at');
    table.timestamp('updated_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('miniexample_metaResponses');
};
