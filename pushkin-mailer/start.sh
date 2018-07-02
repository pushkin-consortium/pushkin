#!/bin/bash
echo "DB container loaded, waiting for rabbitmq"
while ! nc -z message-queue 5672; do sleep 3; done
node index.js
