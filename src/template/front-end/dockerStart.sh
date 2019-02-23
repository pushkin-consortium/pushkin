#!/bin/bash

echo "adding api port to config: ${API_PORT}"

# set to 3000 by default
API_PORT=${API_PORT:-3000}
sed -i 's/${API_PORT}/'"$API_PORT"'/g' nginx.conf

# nginx container's default start command
nginx -g "daemon off;"
