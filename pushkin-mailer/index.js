// using SendGrid's v3 Node.js Library
// https://github.com/sendgrid/sendgrid-nodejs
const sgMail = require('@sendgrid/mail');

const amqp = require('amqplib');
const pug = require('pug');
const path = require('path');
const Email = require('email-templates');
const fs = require('fs')


const FROM_EMAIL = 'rob@oddball.io';
const SITE_URL = 'http://localhost:8000'


sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function healthCheck(msg, ch) {
  ch.ack(msg)
  return ch.sendToQueue(
    msg.properties.replyTo,
    new Buffer(JSON.stringify({ status: "healthy" })),
    { correlationId: msg.properties.correlationId }
  );
}

// create the connection
amqp
  .connect(process.env.AMQP_ADDRESS)
  .then(conn => {
    process.once('SIGINT', function () {
      conn.close();
    });
    // create  seperate channel for this instance of the worker
    return conn.createChannel()
  }).then(ch => {
    ch.assertQueue('mailer', { durable: false })
    return ch
  })
  .catch(err => {
    console.log("Error creating channel")
    console.log(err)
  }).then(ch => {
    ch.prefetch(1);
    ch.consume('mailer', msg => {
      console.log("Mailer received")
      // parse the message into a javascript object
      const rpc = JSON.parse(msg.content.toString('utf8'));
      if (rpc.method == 'health') {
        return healthCheck(msg, ch)
      } else {
        console.log(rpc.params)

        return mailer(rpc.params)
          .then(resp => {
            ch.sendToQueue(
              msg.properties.replyTo,
              new Buffer(JSON.stringify(resp)),
              { correlationId: msg.properties.correlationId }
            );
            return ch.ack(msg);
          })
          .catch(error => {
            console.error(error.toString());
          })
      }
    })
    return ch
  })
  .catch(err => {
    console.log(err);
  });

// const mailObj = {
//   template: string,
//   to: [],
//   fromAddress: [],
//   renderParams: params,
//   subject: string
// }
const TEMPLATE_DIR = 'templates'
function mailer(mailObj) {
  const email = new Email({
    juice: true,
    juiceResources: {
      preserveImportant: true,
      webResources: {
        relativeTo: path.resolve('build')
      }
    }
  });
  const { template, to, from, renderParams, subject } = mailObj
  renderParams.URL = SITE_URL
  return email
    .render(`${template}/html`, renderParams)
    .then(html => {
      const msg = {
        to: to,
        isMultiple: to.length > 1,
        from: FROM_EMAIL,
        subject: subject,
        html: html
      };
      fs.writeFileSync('./email.html', html)
      // comment this line to send emails for real
      // return sgMail.send(msg);
      // return msg
    })
}
