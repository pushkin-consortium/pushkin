// create the actual db connection
const knex = require('knex')(require('./knexfile.js').development);
// config for transaction DB
const config = {
  client: 'postgresql',
  connection: process.env.TRANSACTION_DATABASE_URL
};

// create connection to transaction db
const db2 = require('knex')(config);

// test db connection
db2.raw('select 1+1 as result').then(() => {
  console.log('valid connection....to transaction db');
});

// whenever there is a query, save result in second db
knex.on('query-response', function(one, two, three) {
  const obj = {
    bindings: three.toSQL().bindings,
    query: three.toSQL().sql
  };
  return db2('transactions')
    .insert(obj)
    .then();
});

const fs = require('fs');

// registry plugin to handle models that reference each other
// require all models and pass in db connection

const modelObj = {};
const modelDirectories = fs.readdirSync('./models');

modelDirectories.forEach(function(folder) {
  const isFolder = fs.lstatSync(`./models/${folder}`).isDirectory();

  if (isFolder) {
    const bookshelf = require('bookshelf')(knex);
    const cascadeDelete = require('bookshelf-cascade-delete');
    bookshelf.plugin(cascadeDelete);
    bookshelf.plugin('registry');
    const models = fs.readdirSync(`./models/${folder}`);
    models.forEach(model => {
      require(`./models/${folder}/${model}`)(bookshelf);
    });
    modelObj[folder] = bookshelf;
  }
});

module.exports = modelObj;
