#!/bin/bash
echo "API container loaded, waiting for rabbitmq"
while ! nc -z message-queue 5672; do sleep 3; done
command -v nodemon || npm install -g nodemon
nodemon index.js
