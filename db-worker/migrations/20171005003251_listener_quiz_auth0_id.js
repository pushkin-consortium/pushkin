exports.up = function(knex, Promise) {
  return knex.schema.table('listener-quiz_users', function(table) {
    table.string('auth0_id');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('listener-quiz_users', function(table) {
    table.dropColumn('auth0_id');
  });
};
