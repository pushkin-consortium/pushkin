.. _pushkin_worker:

Pushkin Worker
==============
Pushkin workers interface between RabbitMQ and database(s). A worker is created like this::

   import pushkinWorker from 'pushkin-worker';

   const workerOptions = {
     readQueue: 'myexp_quiz_dbread',
     writeQueue: 'myexp_quiz_dbwrite',
     taskQueue: 'myexp_quiz_taskworker',
     amqpAddress: process.env.AMQP_ADDRESS
   };

   const myWorker = new pushkinWorker(workerOptions);

The queues are the respective RabbitMQ queues to listen on. They should match the names of the queues the API for this experiment is sending on. amqpAddress is a connection string for RabbitMQ and is provided by default in a worker's Docker environment via ``pushkin prep``.

init
-----
**Arguments:** None

**Returns:** Promise. Resolves upon connection to RabbitMQ.

-----------------------------

handle
---------
**Arguments:**
   - **method** : string

     Name of RPC method to associate with this function (below).

   - **handler** : function

     Function to call when this method (above) is called. The value is sent back along the same queue it was received on. Receives a session id, data sent in the rpc call, and the parameters of the request to the API server as defined in the Express framework.

**Returns:** None

-----------------------------

useDefaultHandles
-----------------
**Arguments:**
   - **DB URL** : string

     Connection string for this experiment's main database.

   - **table prefix** : string

     The prefix to assume for default table names in the database. Same as ``shortName`` in the experiment's config.yaml by default.

   - **transaction options** : { url : string, tableName : string, mapper : function }

     An optional argument to enable logging transactions.

     - ``url`` is the connection string for the transaction database.

     - ``tableName`` is the name of the table in this database to log transactions in.

     - ``mapper`` is a function of string -> object. It's given an SQL query string (representing what was run on the main database) and should return an object with fields and values matching what to insert into the transactions table.

**Returns:** None

-----------------------------

start
-------
**Arguments:**
   - **something** : type

     Description

**Returns:** something

