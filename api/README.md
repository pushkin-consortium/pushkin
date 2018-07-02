# Pushkin-API

![](http://i.imgur.com/ncRJMJ5.png)

## Overview
API Server is a light express server that defines the routes accessable to the client.

## Get Started
- All existing routes are listed in `pushkin-api/controllers/[yourQuizName].js` 
- All existing DB methods are listed in `pushkin-db/worker.js`
- Remote Procedure calls are wrapped in a Promise
- RPC api is a javascript object with a method to be called, and the arguments that you want passed to it.
- All errors are logged using winston

## DB Methods
These DB Methods could be found in `pushkin-db/worker.js`, and could be used in any endpoint created in the desired controller file. 

| Method | Description | Params | Example | 
| ------ | ------| ------ | ------ |
| createModel | Create a new Model in the DB, returns a promise | {data} | `whichEnglish.createUser({ name: "Methuselah", age: 1000 })`
| findModel | Find a model in the DB, returns a promise  | id, [relations] | ` whichEnglish.findUser(1, ['posts'])`|
| updateModel | Updates a model in the DB, returns a promise  | id, {data} | ` whichEnglish.updateUser(1, { age: 969 })` |
| deleteModel | Deletes model in the DB, returns 0 upon success | id | `whichEnglish.deleteUser(1)` |
| queryModel | Look for a model using knex queries, returns a promise. http://knexjs.org/#Builder | [[query], [query]], [relations] | `whichEnglish.queryModel([ ['where', 'other_id', '=', '5'], ['where', 'name', '=', 'foo']], ['posts'])` |
| rawModel | Allows raw queries on DB, returns a promise. http://knexjs.org/#Builder | [[query], [query] | `whichEnglish.rawUser([['where', 'name', '=', 'Methuselah'], ['where', 'age', '>', 900 ]])` |
| allModel | Find all models in the DB, returns a promise. | [] | `whichEnglish.allUsers()` |
| getInitialQuestions | Fetches the first three questions in the DB, returns a promise. | [] | `whichEnglish.getInitialQuestions()` |

## Routes Table
Endpoints built by using the methods listed above.
#### General Routes
| URL | Method | Body | Description
| ------ | ------| ------ | ----- |
|`/initialQuestions` | GET | null | Get initial questions for a quiz|

#### Responses
| URL | Method | Body | Description
| ------ | ------| ------ | ----- |
|`/api/responses` | GET | null | Get all responses for a quiz |
|`/api/responses/:id` | GET | null | Get one response with an id |
|`/api/responses` | POST | { user, choiceId, questionId } | Post a response for a quiz and get the next question |
|`/api/responses/:id` | PUT | {data} | Update a response with an id|
|`/api/responses/:id` | DELETE | null | Delete a response with an id|

#### Trials
| URL | Method | Body | Description
| ------ | ------| ------ | ----- |
|`/api/trials` | GET | null | Get all trials for a quiz |
|`/api/trials/:id` | GET | null | Get one trial with an id |
|`/api/trials` | POST | {data} | Create a trial for a quiz|
|`/api/trials/:id` | PUT | {data} | Update a trial with an id|
|`/api/trial/:id` | DELETE | null | Delete a trial with an id|
|`/api/trial/:id/questions`| GET | null | Get all questions with choices for a trial|

#### Users
| URL | Method | Body | Description
| ------ | ------| ------ | ----- |
|`/api/users` | GET | null | Get all users for a quiz |
|`/api/users/:id` | GET | null | Get one user with an id |
|`/api/users` | POST | {data} | Create a user for a quiz|
|`/api/users/:id` | PUT | {data} | Update a user with an id|
|`/api/users/:id` | DELETE | null | Delete a user with an id|

#### Questions
| URL | Method | Body | Description
| ------ | ------| ------ | ----- |
|`/api/questions` | GET | null | Get all questions for a quiz |
|`/api/questions/:id` | GET | null | Get question user with an id |
|`/api/questions` | POST | {trialId, data} | Create a question for a quiz|
|`/api/questions/:id` | PUT | {data} | Update a question with an id|
|`/api/questions/:id` | DELETE | null | Delete a question with an id|

#### Choices
| URL | Method | Body | Description
| ------ | ------| ------ | ----- |
|`/api/choices` | GET | null | Get all choices for a quiz |
|`/api/choices/:id` | GET | null | Get one choice with an id |
|`/api/choices` | POST | {questionId, data} | Create a choice for a quiz|
|`/api/choices/:id` | PUT | {data} | Update a choice with an id|
|`/api/choices/:id` | DELETE | null | Delete a choice with an id|

## Example end-point
* rpcInput takes a DB Method name and a set of params
* [yourQuizName] is automatically appended to the DB Method name
#### Get
```sh
  router.get('/responses', (req, res, next) => {
    const rpcInput = {
      method: 'allResponses',
      params: []
    };
    return rpc(conn, channelName, rpcInput)
      .then(data => {
        res.json(data);
      })
      .catch(next);
  });
```
#### Post
```sh
  router.post('/trials', (req, res, next) => {
    const rpcInput = {
      method: 'createTrial',
      params: [{ name: req.body.name }]
    };
    return rpc(conn, channelName, rpcInput)
      .then(data => {
        res.json(data);
      })
      .catch(next);
  });
```

#### Put
```sh
  router.put('/users/:id', (req, res, next) => {
    const rpcInput = {
      method: 'updateUser',
      params: [req.params.id, req.body]
    };
    return rpc(conn, channelName, rpcInput)
      .then(data => {
        res.json(data);
      })
      .catch(next);
  });
```
#### Delete
```sh
  router.delete('/questions/:id', (req, res, next) => {
    const rpcInput = {
      method: 'deleteQuestion',
      params: [req.params.id]
    };
    return rpc(conn, channelName, rpcInput)
      .then(data => {
        res.json(data);
      })
      .catch(next);
  });
```
## Extension
  - edit or add end points to `pushkin-api/controllers/[yourQuizName].js`
  - edit or add DB Methods to `pushkin-db/worker.js`
