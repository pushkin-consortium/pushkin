/* eslint-env mocha */
/* eslint-disable padded-blocks, no-unused-expressions, max-len */
  var db = require('../db');
  var expect = require('chai').expect;
  describe('Test worker', () => {
    let Worker;
    let preloaded;
    before(() => {
      return db.knex.schema.createTable('test', table => {
        table.increments('id')
        table.string('name')
        return table;
      }).then(() => {
        const TestModel = db.Model.extend({
          tableName: 'test',
        });
        db.model('TestModel', TestModel)
        Worker = require('../worker');
        return new TestModel({
          name: 'preloaded'
        }).save().then(result => {
          preloaded = result.toJSON();

        });
      });
    })
    describe('createTest', () => {
      it('has a method createTest', () => {
        expect(Worker).to.haveOwnProperty('createTestModel');
      });
      it('createTest takes a test schema', () => {
        const testData = {
          name: 'test-data'
        }
        return Worker.createTestModel(testData).then(response => {
          expect(response).to.haveOwnProperty('id');
          expect(response.name).to.eql('test-data');
        });
      });
    })
    describe('findTestModel', () => {
      it('has a method findTestModel', () => {
        expect(Worker).to.haveOwnProperty('findTestModel')
      });
      it('findTestModel has an id', () => {
        return Worker.findTestModel(preloaded.id).then(response => {
          expect(response.name).to.eql('preloaded');
        })
      });
    })
    describe('update Test model', () => {
      it('has a method, updateTestModel', () => {
        expect(Worker).to.haveOwnProperty('updateTestModel')
      })
      it('updates a model in the db', () => {
        return Worker.updateTestModel(preloaded.id, {
          name: 'new-name'
        }).then(response => {
          // expect(response.id).to.eql(preloaded.id);
          expect(response.name).to.eql('new-name');
        })
      })
    })
    describe('delete Test Model', () => {
      it('has a method, deleteTestModel', () => {
        expect(Worker).to.haveOwnProperty('deleteTestModel')
      })
      it('deletes a test model in the DB', () => {
        return Worker.deleteTestModel(preloaded.id).then(response => {
          expect(response).to.eql(0);
          return Worker.findTestModel(preloaded.id).then(response => {
            expect(response).to.eql(null);
          })
        })
      });
    });
    describe('queryTestModel', () => {
      it('has a method queryTestModel', () => {
        expect(Worker).to.haveOwnProperty('queryTestModel');
      });
      it('can query a TestModel based on knex js syntax', () => {
        // TODO: test smell, move the creation and the deletion into before each
        const query = [
          ['where', 'name', '=', 'test-data'],
          ['where', 'id', '<', 100 ],
        ];
        return Worker.queryTestModel(query).then(response => {
          expect(response).to.have.length(1);
          expect(response[0].name).to.eql('test-data');
        })
      })
    });
    describe('rawTestModel', () => {
      it('has a rawTestModel method', () => {
        expect(Worker).to.haveOwnProperty('rawTestModel');
      });
      it('can execute arbitrary query strings through that method', () => {
        return Worker.rawTestModel(`SELECT COUNT(*) from test`).then((response) => {
          expect(response[0].count).to.eql('1');
        })
      })
    });
    describe('allTestModels', () => {
      it('has a method allTestModels', () => {
        expect(Worker).to.haveOwnProperty('allTestModels')
      });
      it('returns all the data in db', () => {
        return Worker.allTestModels().then(results => {
          expect(results).to.have.length(1)
        })
      })
    });
    describe('getInitialQuestion', () => {
      it('has a method getInitalQuestions', () => {
        expect(Worker).to.haveOwnProperty('getInitialQuestions');
      })
    })


    after(() => {
      // db tear down
      return db.knex.schema.dropTable('test');
    })
  })