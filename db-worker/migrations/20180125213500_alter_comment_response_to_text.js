
exports.up = function(knex, Promise) {
  return knex.schema.alterTable('forum-comments', table => { 
    table.text('responses').alter()
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.alterTable('forum-comments', table => { 
    table.string('responses').alter()
  })
};
