const amqp = require('amqplib');
const Worker = require('./worker');
const DB_WRITE_QUEUE = '_db_write';
const DB_RPC_WORKER = '_rpc_worker';
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const jsonrpc = require('./rpc');
logger.info(Object.keys(Worker));
const uniq = require('lodash.uniq');
const CONFIG = require('./config')


const quizzes = fs
  .readdirSync(path.resolve(__dirname, './models'))
  .filter(folder =>
    fs.lstatSync(path.resolve(__dirname, './models', folder)).isDirectory()
  );

// create the connection
amqp
  .connect(process.env.AMPQ_ADDRESS)
  .then(conn => {
    console.log("worker up")
    // create  seperate channel for this instance of the worker
    return conn.createChannel().then(ch => {
      logger.info('channel created');
      // on SIGINT ensure the channel is closed
      process.once('SIGINT', function () {
        conn.close();
      });

      //  create a rpc listener on both quizzed
      return Promise.all(
        quizzes.map(quizName => {
          // the queue name is created by the folders in /models
          const rpc_queue = quizName + DB_RPC_WORKER;
          const write_queue = quizName + DB_WRITE_QUEUE;
          // name of the queue
          // this queue is not marked as durable, as it is an rpc
          // if rabbitmq goes down, theres really nothing to replyTo
          let durable = false;
          return ch
            .assertQueue(rpc_queue, { durable })
            .then(() => {
              // set the maximum amount of messages that can be waiting before this channel accepts more
              // more info here http://www.squaremobius.net/amqp.node/channel_api.html#channel_prefetch
              ch.prefetch(1);
              // consume on the specific queue

              return ch.consume(rpc_queue, msg => {
                logger.info("Message received");
                // parse the message into a javascript object
                const rpc = JSON.parse(msg.content.toString('utf8'));
                if (rpc.method == 'health') {
                  jsonrpc(conn, 'mailer', { method: 'health' })
                    .then((data) => {
                      const payload = {
                        'worker': {
                          status: "healthy", methods: Object.keys(Worker)
                        },
                        'mailer': data
                      }
                      ch.sendToQueue(
                        msg.properties.replyTo,
                        new Buffer(JSON.stringify(payload)),
                        { correlationId: msg.properties.correlationId }
                      );
                      // acknowledge receipt
                      ch.ack(msg);
                    })
                } else {
                  const method = `${quizName}.${rpc.method}`;
                  logger.info('db_rpc_worker', { rpc });
                  logger.info('correlation_id', msg.correlationId);
                  logger.info('routing_key', msg.routingKey);
                  logger.info('reply_to', msg.replyTo);
                  logger.info('method', method);

                  //  check that this method is defined on the Worker
                  if (typeof Worker[method] === 'undefined') {
                    logger.error(rpc);
                    // throw an error otherwise
                    // TODO: put this in a seperate queue of bad messages.
                    // possible dead letter exchange: http://www.rabbitmq.com/dlx.html
                    throw new Error(
                      `This method ${method} is not defined on the worker`
                    );
                  }
                  // call the Worker with the defined method
                  return Worker[method].apply(Worker, rpc.params).then(data => {
                    logger.info('Worker result', data);
                    // send to the queue with the original replyTo,
                    // pass it back with the correlation ID given
                    logger.log('replyTo', msg.properties.replyTo);
                    logger.log('correlationId', msg.properties.correlationId);
                    ch.sendToQueue(
                      msg.properties.replyTo,
                      new Buffer(JSON.stringify(data)),
                      { correlationId: msg.properties.correlationId }
                    );
                    // acknowledge receipt
                    ch.ack(msg);
                    if (CONFIG.forum) {
                      console.log("forum config is on")
                      if (method == 'forum.createForumPost') {
                        console.log("createing a forum post")

                        // notify the quiz author that someone has created a new forum post about their quiz
                        data = data.toJSON();
                        return Worker['forum.raw'](`SELECT * FROM authors where quiz_name = '${data.quiz}'`)
                          .then(authors => {
                            if (authors.length > 0) {
                              // const mailObj = {
                              //   template: string,
                              //   to: [],
                              //   fromAddress: [],
                              //   renderParams: params,
                              //   subject: string
                              // }
                              var rpcBody = {
                                method: 'mail',
                                params: {
                                  template: 'notify-author',
                                  to: authors.map(author => author.email),
                                  renderParams: {
                                    quiz: data.quiz,
                                    post_id: data.id,
                                    title: 'You have a new thread',
                                  },
                                  subject: 'Someone has created a post about your quiz'
                                }
                              }
                              return jsonrpc(conn, 'mailer', rpcBody)
                            } else {
                              return Promise.resolve();
                            }
                          })
                      }
                      if (method == 'forum.createForumComment') {
                        data = data.toJSON();
                        //notify the thread author, the quiz author and possibly the other commentors
                        return Worker['forum.raw'](`SELECT * FROM authors JOIN "forum-posts" ON "forum-posts".quiz = authors.quiz_name where "forum-posts".id = '${data.post_id}'`)
                          .then(authors => {
                            return Worker['forum.raw'](`SELECT email FROM "forum-comments" JOIN "users_emails" ON "users_emails"."auth0_id" = "forum-comments".auth0_id where "forum-comments".post_id = '${data.post_id}'`)
                              .then(emails => {
                                return {
                                  authors,
                                  emails,
                                }
                              })
                          })
                          .then(({ authors, emails }) => {
                            let allEmails = []
                            if (authors.lenght > 0) {
                              authors.forEach(author => {
                                allEmails.push(author.email)
                              })
                            }
                            if (emails.length > 0) {
                              emails.forEach(email => {
                                allEmails.push(email.email)
                              })
                            }
                            allEmails = uniq(allEmails)
                            if (allEmails.length > 0) {
                              var rpcBody = {
                                method: 'mail',
                                params: {
                                  template: 'thread-reply',
                                  to: allEmails,
                                  renderParams: {
                                    quiz: data.quiz,
                                    post_id: data.post_id,
                                    title: 'You have a new thread',
                                  },
                                  subject: 'Someone has replied to your thread'
                                }
                              }
                              // const mailObj = {
                              //   template: string,
                              //   to: [],
                              //   fromAddress: [],
                              //   renderParams: params,
                              //   subject: string
                              // }
                              return jsonrpc(conn, 'mailer', rpcBody)
                            }
                            return Promise.resolve();
                          })
                      }
                    }
                  }).catch(err => {
                    logger.error(err)
                    ch.sendToQueue(
                      msg.properties.replyTo,
                      new Buffer(JSON.stringify({ err })),
                      { correlationId: msg.properties.correlationId },
                    );
                    ch.ack(msg);
                  });
                }
              });
            })
            .then(() => {
              // this queue is marked as durable, we want DB writes to persist through a rabbitmq crash
              durable = false;
              logger.info('asserting queue', write_queue, 'durable', durable);
              return ch.assertQueue(write_queue, { durable }).then(() => {
                logger.log('queue asserted', write_queue);
                ch.prefetch(1);
                return ch.consume(write_queue, msg => {
                  logger.log('DB WRITE QUEUE', msg.content.toString('utf8'));
                  const rpc = JSON.parse(msg.content.toString('utf8'));
                  // Data is returned but not used for anything
                  const method = `${quizName}.${rpc.method}`;
                  logger.log('method', method);
                  return Worker[method].apply(Worker, rpc.params).then(data => {
                    logger.log('was saved in db', data);
                    return ch.ack(msg);
                  });
                });
              });
            });
        })
      ).then(() => {
        logger.log('All queues executued');
      });
    });
  })
  .catch(err => {
    console.log(err.stack);
    logger.error(err.message);
  });
