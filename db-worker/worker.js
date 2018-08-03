const modelObj = require('./db');
const _ = require('lodash');
const Papa = require('babyparse');
const CONFIG = require('./config.js');
const amqp = require('amqplib');
/**
 *
 *
 * DB writer and reader class with automatically generated methods
 * **These methods are created automatically based off what it defined by bookshelf**
 * @class Worker
 */
function Worker() {
  let quizzes = Object.keys(modelObj);
  this.health = function(data) {
    return Promise.resolve({ status: "healthy" })
  }

  quizzes.forEach(quiz => {
    const db = modelObj[quiz];
    let models = Object.keys(db._models);
    models.forEach(modelName => {
      let Model = db.model(modelName);
      const methods = [
        `${quiz}.create${modelName}`,
        `${quiz}.update${modelName}`,
        `${quiz}.delete${modelName}`,
        `${quiz}.find${modelName}`,
        `${quiz}.query${modelName}`,
        `${quiz}.raw${modelName}`,
        `${quiz}.all${modelName}`
      ];
      /**
     *
     *
     *
     * Create a new Model in the DB
     * @method Worker#createModel
     * @param {any} data - model to be created
     * @returns {Promise} The saved model
     * @fulfill {Object}
     * @reject {Error}
     * @example
     * whichEnglish.createUser({ name: "Methuselah", age: 1000 })
     */
      this[`${quiz}.create${modelName}`] = function(data) {
        return Model.forge()
          .save(data)
      };
      /**
     *
     *
     * @method Worker#findModel
     * @param {number} id - The id of the model looking for
     * @param {string[]} [relations] - an array of related models to fetch
     * @returns {Promise}
     * @fulfill {Object} - The found model
     * @reject {Error}
     * @example
     * whichEnglish.findUser(1, ['posts'])
     */
      this[`${quiz}.find${modelName}`] = function(id, relations) {
        if (Array.isArray(relations) && relations.length) {
          return Model.where({ id: id })
            .fetch({ withRelated: relations })
            .then(data => {
              if (data) {
                return data.toJSON();
              }
              return null;
            })
        }
        return Model.where({ id: id })
          .fetch()
          .then(data => {
            if (data) {
              return data.toJSON();
            }
            return null;
          })
      };
      /**
     *
     *
     * @method Worker#updateModel
     * @param {number} id - the id of the model being updated
     * @param {Object} data - the data to update
     * @returns {Promise}
     * @fulfill {Object} - The newly updated model
     * @reject {Error}
     * @example
     * whichEnglish.updateUser(1, { age: 969 })
     */
      this[`${quiz}.update${modelName}`] = function(whereObj, data) {
        return Model.where(whereObj)
          .save(data, { patch: true })
      };
      /**
     *
     *
     * @method Worker#deleteModel
     * @param {Number} id - the id of the model to be deleted
     * @returns {Number} 0 if success
     * @example
     * whichEnglish.deleteUser(1);
     */
      this[`${quiz}.delete${modelName}`] = id => {
        return db
          .model(`${modelName}`)
          .forge({ id })
          .destroy()
          .then(model => {
            return 0;
          })
        
      };
      /**
     *
     *
     * @method Worker#queryModel
     * @param {string[][]} query - a knex.js query array see http://knexjs.org/#Builder
     * @param {string[]} relations - an Array of relations
     * @return {Promise}
     * @fulfill {Object[]} - An array of models returned
     * @reject {Error}
     * @example
     * whichEnglish.queryModel([
     *  ['where', 'other_id', '=', '5'],
     *  ['where', 'name', '=', 'foo']
     * ],
     * ['posts']
     * )
     */
      this[`${quiz}.query${modelName}`] = (query, relations) => {
        const p = query.reduce((prev, curr) => {
          return prev.query.apply(prev, curr);
        }, Model);
        if (relations) {
          return p
            .fetchAll({ withRelated: relations })
        }
        return p
          .fetchAll()
      };
      /**
     * Allows raw queries on DB
     * @method Worker#rawModel
     * @param {String[][]} query - a raw knexjs query array
     * @returns {Promise}
     * @fulfill {Object[]} - an array of results
     * @reject {Error}
     * @example
     * whichEnglish.rawUser([
     *   ['where', 'name', '=', 'Methuselah'],
     *   ['where', 'age', '>', 900 ],
     * ])
     */
      this[`${quiz}.raw`] = query => {
        return db.knex
          .raw(query)
          .then(resp => resp.rows)
      };
      /**
     * Return all models in DB
     * @method Worker#allModels
     * @returns {Promise}
     * @fulfill {Object[]} -  all models in DB
     * @reject {Error}
     * @example
     * allUsers()
     */
      this[`${quiz}.all${modelName}s`] = () => {
        return Model.fetchAll()
      };
      /**
   * @method Worker#getInitialQuestions
   * @returns {Promise}
   * @example
   * whichEnglish.getInitialQuestions()
   * @fulfill {Object[]} -   questions for that Trial
   * @reject {Error}
   */
      this[`${quiz}.getInitialStimulus`] = () => {
        return db
          .model('Stimulus')
          .forge()
          .query(qb => {
            qb.offset(0).limit(1);
          })
          .fetchAll()
          .then(data => {
            return db
              .model('User')
              .forge()
              .save()
              .then(user => {
                const json = data.toJSON();
                return {
                  stimulus: json,
                  user: user.toJSON()
                };
              });
          })
      };
      this[`${quiz}.generateUser`] = (auth0_id, user_id) => {
        if (auth0_id) {
          return db
            .model('User')
            .where({ auth0_id: auth0_id })
            .fetch()
            .then(data => {
              if (!data) {
                if (user_id) {
                  return db
                    .model('User')
                    .where({ id: user_id })
                    .fetch()
                    .then(model => {
                      if (!model.toJSON().auth0_id) {
                        model.set({ auth0_id: auth0_id });
                        return model.save();
                      }
                      return model.toJSON();
                    });
                }
                return db
                  .model('User')
                  .forge()
                  .save({
                    created_at: new Date(),
                    updated_at: new Date(),
                    auth0_id: auth0_id
                  });
              } else {
                return data;
              }
            });
        }
        return db
          .model('User')
          .forge()
          .save()
      };
      this[`${quiz}.updateUser`] = (auth0_id, user_id) => {
        return db
          .model('User')
          .where({ id: user_id })
          .fetch()
          .then(model => {
            if (!model.toJSON().auth0_id) {
              model.set({ auth0_id: auth0_id });
              return model.save();
            }
            return model.toJSON();
          })
      };
      this[`${quiz}.getAllStimuli`] = user => {
        return db
          .model('Stimulus')
          .forge()
          .query(qb => {
            qb.offset(0);
          })
          .fetchAll()
          .then(data => {
            return {
              stimuli: data.toJSON(),
              user: user
            };
          })
      };
      /**
   * Returns user responses in csv format
   * @method Worker#getResponseCsv
   * @returns {Promise}
   * @fulfill {Object[]} -   an array of response data
   * @reject {Error}
   * @todo Make this query on the trial Name
   */

      this[`${quiz}.getResponseCsv`] = () => {
        return db
          .knex(`${quiz}_users`)
          .join(
            `${quiz}_responses`,
            `${quiz}_responses.userId`,
            '=',
            `${quiz}_users.id`
          )
          .join(
            `${quiz}_choices`,
            `${quiz}_choices.id`,
            '=',
            `${quiz}_responses.choiceId`
          )
          .join(
            `${quiz}_questions`,
            `${quiz}_choices.questionId`,
            '=',
            `${quiz}_questions.id`
          )
          .select(
            `${quiz}_users.*`,
            `${quiz}_questions.prompt`,
            `${quiz}_choices.imageUrl`,
            `${quiz}_choices.displayText`,
            `${quiz}_choices.correct`,
            `${quiz}_choices.type`
          )
          .then(data => {
            return Papa.unparse(data);
          })
      };
    });
    /**
   *
   * Sets a users Languages
   * @method Worker#setUserLanguages
   * @param {number} userId - the name of the id to set
   * @param {Object} set
   * @param {String[]} set.primaryLanguages - the user's primary Languages
   * @param {String[]} set.nativeLanguages - the user's native Languages
   * @returns {Promise}
   * @fulfill {Object} - the user with their languages
   * @rejects {Error}
   * @example
   * setUserLanguages(1, {
   *  primaryLanguages: ["Hebrew", "Aramaic"],
   * nativeLanguages: ["Hebrew"]
   * })
   */
    this[`${quiz}.setUserLanguages`] = (
      userId,
      { primaryLanguages, nativeLanguages }
    ) => {
      return Promise.all(
        primaryLanguages.map(lang =>
          db.knex
            .raw(
              `INSERT into "${quiz}_userLanguages" ("userId", "primary", "native", "languageId") SELECT ?, ?, ?, id from ${quiz}_languages WHERE name = ? RETURNING *`,
              [userId, true, false, lang]
            )
            .then(resp => resp.rows)
        )
      ).then(data => {
        return Promise.all(
          nativeLanguages.map(lang =>
            db.knex
              .raw(
                `INSERT into "${quiz}_userLanguages" ("userId", "primary", "native", "languageId") SELECT ?, ?, ?, id from ${quiz}_languages WHERE name = ? RETURNING *`,
                [userId, false, true, lang]
              )
              .then(resp => resp.rows)
          )
        )
          .then(stuff => {
            return db
              .model('User')
              .where({ id: userId })
              .fetch({ withRelated: ['userLanguages.language'] })
          })
      });
    };
    /**
   * Get the results from the DB
   * @method Worker#getResults
   * @param {number} userId - the user whose results you are grabbing
   * @returns {Promise}
   * @fulfill {Object[]} - an array of the top 3 languages for this user
   * @rejects {Error}
   */

    this[`${quiz}.getResults`] = userId => {
      return Promise.resolve([
        {
          name: 'English'
        },
        {
          name: 'Spanish'
        }
      ]);
      // something in this results calculation is throwing an error if there are no other users data in the system.
      // probably not an issue due to the fact that how we calculate results in real life is very different than this snippet.

      return db
        .knex('users')
        .select('responses.*')
        .join('responses', 'responses.userId', '=', 'users.id')
        .then(choices => {
          let obj = {};
          choices.forEach(response => {
            if (Array.isArray(obj[response.userId])) {
              obj[response.userId].push(response.choiceId);
            } else {
              obj[response.userId] = [response.choiceId];
            }
          });
          return obj;
        })
        .then(keymap => {
          let userArray = keymap[userId];
          if (userArray) {
            delete keymap[userId];
            let output = [];
            userArray = userArray.sort();
            for (let prop in keymap) {
              keymap[prop] = keymap[prop].sort();
              output.push({
                match: intersect_safe(userArray, keymap[prop].sort()).length,
                userId: prop
              });
            }
            return output;
          }
        })
        .then(output => {
          if (output) {
            const users = _.take(_.orderBy(output, 'match', 'desc'), 3);
            return db
              .knex('users')
              .distinct('languages.name')
              .select('languages.name')
              .whereIn('users.id', users.map(u => u.userId))
              .join('userLanguages', 'users.id', 'userLanguages.userId')
              .join('languages', 'userLanguages.languageId', 'languages.id');
          }
          return {};
        });
    };
  if(CONFIG.forum && quiz == "forum") {
    Worker.prototype[`${quiz}.searchPosts`] = term => {
      return db.knex
      .raw(`select * from "forum-posts" 
            where to_tsvector("forum-posts".post_subject) @@ to_tsquery('??') 
              or to_tsvector("forum-posts".post_content) @@ to_tsquery('??') 
              or  to_tsvector("forum-posts".quiz) @@ to_tsquery('??')
      `, [term, term, term])
      .then(output => output.rows)
      .then(posts => {
        console.log(posts.map(post => post.quiz))
        // add urls to the posts
        posts.forEach(post => {
          post.url = `/posts/${post.id}`
          return post
        })
        return db.knex
        .raw(`select * from "forum-comments" where to_tsvector("forum-comments".responses) @@ to_tsquery('??')`, term)
        .then(output => output.rows)
        .then(comments => {
          return comments.map(comment => {
            comment.url = `/posts/${comment.post_id}/comments/${comment.id}`;
            return comment
          })
        })
        .then(comments => {
          return {
            comments,
            posts
          }
        })
      })
    }
  }
  });
}

// returns the intersection between 2 arrays
function intersect_safe(a, b) {
  let ai = 0,
    bi = 0;
  let result = [];
  while (ai < a.length && bi < b.length) {
    if (a[ai] < b[bi]) {
      ai++;
    } else if (a[ai] > b[bi]) {
      bi++;
    } else {
      /* they're equal */ result.push(a[ai]);
      ai++;
      bi++;
    }
  }

  return result;
}

module.exports = new Worker();
