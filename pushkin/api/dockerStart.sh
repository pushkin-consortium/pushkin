#!/bin/bash

echo "API container loaded, waiting for rabbitmq"
AMQP_DOMAIN=$(echo $AMQP_ADDRESS | sed -e "s/[^/]*\/\/\([^@]*@\)\?\([^:/]*\).*/\2/")
echo "Waiting for port 5672 on $AMQP_DOMAIN"
while ! nc -z $AMQP_DOMAIN 5672; do sleep 3; done
echo "API container found rabbitmq, starting"

yarn start
