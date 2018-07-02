#!/bin/bash

cd /Users/jacob/GoogleDrive/pushkin/dev/pushkin-only/front-end
node compile.js
# rm -rf ../server/html/*
# cp -rf dist/* ../server/html
# cd ../server
# docker build -t bennetkl/pushkin-server .
# docker run -P -d -e API_PORT=3000 bennetkl/pushkin-server
# docker ps
