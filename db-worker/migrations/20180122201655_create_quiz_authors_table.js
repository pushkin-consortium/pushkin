
exports.up = function(knex, Promise) {
  return knex.schema.createTable('authors', t => {
    t.increments();
    t.string('first_name');
    t.string('last_name');
    t.string('email');
    t.string('quiz_name')
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('authors')
  
};
