exports.up = function(knex, Promise) {
  return knex.schema.createTable('forum-posts', table => {
    table.increments('id').primary();
    table.timestamp('created_at');
    table.timestamp('updated_at');
    table.string('post_subject');
    table.json('stim');
    table.string('post_content');
    table.string('auth0_id');
    table.string('quiz');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('forum-posts');
};
