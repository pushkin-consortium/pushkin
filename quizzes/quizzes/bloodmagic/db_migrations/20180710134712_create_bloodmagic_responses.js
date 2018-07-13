exports.up = function(knex) {
  return knex.schema.createTable('bloodmagic_responses', table => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('bloodmagic_users');
    table.json('data_string');
    table.timestamp('created_at');
    table.timestamp('updated_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('bloodmagic_responses');
};
