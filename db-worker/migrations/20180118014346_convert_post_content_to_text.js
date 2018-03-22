
exports.up = function(knex, Promise) {
  return knex.schema.alterTable('forum-posts', table => { 
    table.text('post_content').alter()
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.alterTable('forum-posts', table => { 
    table.string('post_content').alter()
  })
  
};
