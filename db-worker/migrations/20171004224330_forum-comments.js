exports.up = function(knex, Promise) {
  return knex.schema.createTable('forum-comments', table => {
    table.increments('id').primary();
    table.string('auth0_id');
    table.string('responses');
    table.timestamp('created_at');
    table.timestamp('updated_at');
    table
      .integer('post_id')
      .references('id')
      .inTable('forum-posts')
      .onDelete('CASCADE')
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('forum-comments');
};
