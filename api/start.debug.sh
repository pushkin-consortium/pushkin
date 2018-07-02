#!/bin/bash
echo "API container loaded, waiting for rabbitmq"
while ! nc -z message-queue 5672; do sleep 3; done
echo "Rabbitmq loaded"
npm install -g nodemon
nodemon --inspect=5858 server.js