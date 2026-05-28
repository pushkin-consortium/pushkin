exports.up = function (knex) {
  return knex.schema.createTable("transactions", function (table) {
    table.increments();
    table.string("query", 800).notNullable();
    table.string("bindings");
    table.timestamps();
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("transactions");
};
