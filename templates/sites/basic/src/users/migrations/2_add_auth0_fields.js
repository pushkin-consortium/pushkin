exports.up = function (knex) {
  return knex.schema.table("pushkin_users", (table) => {
    table.string("auth0_id").unique();
    table.string("email");
    table.string("name");
    table.text("picture");
    table.string("auth_provider");
  });
};

exports.down = function (knex) {
  return knex.schema.table("pushkin_users", (table) => {
    table.dropColumn("auth0_id");
    table.dropColumn("email");
    table.dropColumn("name");
    table.dropColumn("picture");
    table.dropColumn("auth_provider");
  });
};
