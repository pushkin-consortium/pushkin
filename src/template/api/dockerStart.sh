#!/bin/bash

echo "API container loaded, waiting for rabbitmq"
while ! nc -z message-queue 5672; do sleep 3; done
echo "API container found rabbitmq, starting"

node index.js
