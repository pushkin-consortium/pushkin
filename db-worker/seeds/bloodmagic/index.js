const Papa = require('babyparse');
const fs = require('fs');
const path = require('path');
const modelObj = require('../../db');
const flatten = require('lodash.flatten');
console.log('seeding');
let quiz = path
  .resolve(__dirname)
  .split('/')
  .pop();
const db = modelObj[quiz];
const data = Papa.parseFiles([`./seeds/${quiz}/stimuli.csv`], { header: true });
const stimuli = data[0].data;
console.log(stimuli);
module.exports = () => {
  return db
    .knex(`${quiz}_stimuli`)
    .del()
    .then(() => {
      return db
        .knex(`${quiz}_stimuli`)
        .insert(stimuli)
        .returning('*');
    })
    .then(data => {
      console.log(data); // eslint-disable-line no-console
    })
    .then(() => {
      return db.knex('authors').insert({
        first_name: 'Joshua',
        last_name: 'Hartshorne',
        email: 'rob@oddball.io',
        quiz_name: quiz
      })
    })
    .then(() => {
      console.log('done seeding!');
      return process.exit();
    })
    .catch(err => {
      console.log(err); // eslint-disable-line no-console
    })
};

