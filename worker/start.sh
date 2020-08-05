#!/bin/bash
AMPQ_DOMAIN=$(echo $AMPQ_ADDRESS | sed -e "s/[^/]*\/\/\([^@]*@\)\?\([^:/]*\).*/\2/")
echo "Waiting for port 5672 on $AMPQ_DOMAIN"
while ! nc -z $AMPQ_DOMAIN 5672; do sleep 3; done
echo "Rabbitmq loaded"
node index.js
